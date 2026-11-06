/**
 * PaymentAllocationService
 *
 * Chronological allocation with explicit penalty handling.
 *
 * Policy (fixed, not a workaround):
 *   For each open instalment in installment_number ASC order:
 *     1. Apply cash to outstanding penalty_amount first
 *     2. Apply remaining cash to instalment (amount_due - amount_paid)
 *     3. Stop when payment cash is exhausted
 *
 * PAID only when instalment is fully paid AND penalty_amount is 0.
 * Otherwise PARTIAL (or leave OVERDUE if still overdue and nothing fully cleared
 *  — we set PARTIAL when any money applied but obligations remain).
 *
 * Reversal restores amount_paid, penalty_amount and previous_status from
 * payment_allocations rows (instalment_applied / penalty_applied).
 *
 * All schedule mutations use raw SQL (never TypeORM save on partial entities).
 */

import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';

export interface AllocationLineDetail {
  scheduleId: number;
  installmentNumber?: number;
  dueDate?: string | null;
  applied: number;
  instalmentApplied: number;
  penaltyApplied: number;
  previousStatus: string;
  newStatus: string;
  previousPenalty: number;
  newPenalty: number;
}

export interface AllocationResult {
  loanId: number;
  originalAmount: number;
  allocated: number;
  remaining: number;
  totalInstalmentApplied: number;
  totalPenaltyApplied: number;
  rowsUpdated: number;
  detail: AllocationLineDetail[];
}

interface ScheduleRow {
  id: number;
  installment_number: string;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  penalty_amount: string;
  status: string;
}

@Injectable()
export class PaymentAllocationService {
  private readonly logger = new Logger(PaymentAllocationService.name);

  private emptyResult(loanId: number, originalAmount: number): AllocationResult {
    return {
      loanId,
      originalAmount,
      allocated: 0,
      remaining: originalAmount,
      totalInstalmentApplied: 0,
      totalPenaltyApplied: 0,
      rowsUpdated: 0,
      detail: [],
    };
  }

  /**
   * Live allocation inside the caller's transaction.
   */
  async allocatePayment(
    manager: EntityManager,
    paymentId: number,
    loanId: number,
    amount: number,
    receiptNumber: string,
    paymentMethod: string,
    paymentDate: Date,
  ): Promise<AllocationResult> {
    const originalAmount = Math.round(Number(amount));
    if (originalAmount <= 0) {
      return this.emptyResult(loanId, originalAmount);
    }

    const rows: ScheduleRow[] = await manager.query(
      `SELECT id, installment_number, due_date, amount_due, amount_paid,
              COALESCE(penalty_amount, 0) AS penalty_amount, status
         FROM loan_schedules
        WHERE loan_id = $1
          AND status IN (
            'PENDING'::loan_schedules_status_enum,
            'PARTIAL'::loan_schedules_status_enum,
            'OVERDUE'::loan_schedules_status_enum
          )
        ORDER BY installment_number ASC`,
      [loanId],
    );

    if (!rows.length) {
      this.logger.log(`allocatePayment: no open schedules for loan ${loanId}`);
      return this.emptyResult(loanId, originalAmount);
    }

    let remaining = originalAmount;
    const detail: AllocationLineDetail[] = [];
    let totalInstalmentApplied = 0;
    let totalPenaltyApplied = 0;

    for (const row of rows) {
      if (remaining <= 0) break;

      const amountDue = Math.round(Number(row.amount_due));
      const alreadyPaid = Math.round(Number(row.amount_paid ?? 0));
      const penaltyOutstanding = Math.max(0, Math.round(Number(row.penalty_amount ?? 0)));
      const instalmentOutstanding = Math.max(0, amountDue - alreadyPaid);

      if (instalmentOutstanding <= 0 && penaltyOutstanding <= 0) {
        continue;
      }

      const previousStatus = row.status;
      const previousPenalty = penaltyOutstanding;

      // 1) Penalty first
      let penaltyApplied = 0;
      if (penaltyOutstanding > 0 && remaining > 0) {
        penaltyApplied = Math.min(remaining, penaltyOutstanding);
        remaining -= penaltyApplied;
      }

      // 2) Instalment next
      let instalmentApplied = 0;
      if (instalmentOutstanding > 0 && remaining > 0) {
        instalmentApplied = Math.min(remaining, instalmentOutstanding);
        remaining -= instalmentApplied;
      }

      const applied = penaltyApplied + instalmentApplied;
      if (applied <= 0) continue;

      const newPaid = alreadyPaid + instalmentApplied;
      const newPenalty = penaltyOutstanding - penaltyApplied;

      let newStatus: string;
      if (newPaid >= amountDue && newPenalty <= 0) {
        newStatus = ScheduleStatus.PAID;
      } else if (newPaid > 0 || penaltyApplied > 0) {
        // Instalment not fully clear and/or penalty remains
        newStatus = ScheduleStatus.PARTIAL;
      } else {
        newStatus = previousStatus;
      }

      await manager.query(
        `UPDATE loan_schedules
            SET amount_paid     = $1,
                penalty_amount  = $2,
                status          = $3::loan_schedules_status_enum,
                receipt_number  = $4,
                payment_method  = $5,
                paid_date       = $6,
                updated_at      = NOW()
          WHERE id = $7`,
        [newPaid, newPenalty, newStatus, receiptNumber, paymentMethod, paymentDate, row.id],
      );

      // Prefer extended columns when migration 0030 applied; also write amount_applied total
      await manager.query(
        `INSERT INTO payment_allocations
           (payment_id, schedule_id, amount_applied,
            instalment_applied, penalty_applied,
            previous_status, new_status, created_at)
         VALUES ($1, $2, $3, $4, $5,
                 $6::loan_schedules_status_enum, $7::loan_schedules_status_enum, NOW())`,
        [
          paymentId,
          row.id,
          applied,
          instalmentApplied,
          penaltyApplied,
          previousStatus,
          newStatus,
        ],
      );

      totalInstalmentApplied += instalmentApplied;
      totalPenaltyApplied += penaltyApplied;
      detail.push({
        scheduleId: row.id,
        installmentNumber: Number(row.installment_number),
        dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
        applied,
        instalmentApplied,
        penaltyApplied,
        previousStatus,
        newStatus,
        previousPenalty,
        newPenalty,
      });
    }

    const allocated = originalAmount - remaining;
    this.logger.log(
      `allocatePayment loan=${loanId} payment=${paymentId} ` +
        `allocated=${allocated} instalment=${totalInstalmentApplied} penalty=${totalPenaltyApplied} left=${remaining}`,
    );

    return {
      loanId,
      originalAmount,
      allocated,
      remaining,
      totalInstalmentApplied,
      totalPenaltyApplied,
      rowsUpdated: detail.length,
      detail,
    };
  }

  /**
   * Dry-run for cashier preview — identical policy, no writes.
   */
  async previewAllocation(
    manager: EntityManager,
    loanId: number,
    amount: number,
  ): Promise<{
    loanId: number;
    amountReceived: number;
    totalAllocated: number;
    unallocated: number;
    totalInstalmentAllocated: number;
    totalPenaltyAllocated: number;
    policy: string;
    lines: Array<{
      scheduleId: number;
      installmentNumber: number;
      dueDate: string | null;
      amountDue: number;
      amountAlreadyPaid: number;
      instalmentOutstanding: number;
      penaltyOutstanding: number;
      totalOutstanding: number;
      instalmentAllocated: number;
      penaltyAllocated: number;
      allocated: number;
      instalmentRemainingAfter: number;
      penaltyRemainingAfter: number;
      resultingStatus: string;
    }>;
  }> {
    const amountReceived = Math.round(Number(amount) || 0);
    const policy =
      'Chronological by instalment number. Within each instalment: penalty first, then instalment principal/due.';

    const lines: any[] = [];
    if (amountReceived <= 0) {
      return {
        loanId,
        amountReceived,
        totalAllocated: 0,
        unallocated: 0,
        totalInstalmentAllocated: 0,
        totalPenaltyAllocated: 0,
        policy,
        lines,
      };
    }

    const rows: ScheduleRow[] = await manager.query(
      `SELECT id, installment_number, due_date, amount_due, amount_paid,
              COALESCE(penalty_amount, 0) AS penalty_amount, status
         FROM loan_schedules
        WHERE loan_id = $1
          AND status IN (
            'PENDING'::loan_schedules_status_enum,
            'PARTIAL'::loan_schedules_status_enum,
            'OVERDUE'::loan_schedules_status_enum
          )
        ORDER BY installment_number ASC`,
      [loanId],
    );

    let remaining = amountReceived;
    let totalInstalmentAllocated = 0;
    let totalPenaltyAllocated = 0;

    for (const row of rows) {
      if (remaining <= 0) break;
      const amountDue = Math.round(Number(row.amount_due));
      const alreadyPaid = Math.round(Number(row.amount_paid ?? 0));
      const penaltyOutstanding = Math.max(0, Math.round(Number(row.penalty_amount ?? 0)));
      const instalmentOutstanding = Math.max(0, amountDue - alreadyPaid);
      if (instalmentOutstanding <= 0 && penaltyOutstanding <= 0) continue;

      let penaltyAllocated = 0;
      if (penaltyOutstanding > 0 && remaining > 0) {
        penaltyAllocated = Math.min(remaining, penaltyOutstanding);
        remaining -= penaltyAllocated;
      }
      let instalmentAllocated = 0;
      if (instalmentOutstanding > 0 && remaining > 0) {
        instalmentAllocated = Math.min(remaining, instalmentOutstanding);
        remaining -= instalmentAllocated;
      }
      const allocated = penaltyAllocated + instalmentAllocated;
      if (allocated <= 0) continue;

      const instalmentRemainingAfter = instalmentOutstanding - instalmentAllocated;
      const penaltyRemainingAfter = penaltyOutstanding - penaltyAllocated;
      let resultingStatus: string;
      if (instalmentRemainingAfter <= 0 && penaltyRemainingAfter <= 0) {
        resultingStatus = 'PAID';
      } else {
        resultingStatus = 'PARTIAL';
      }

      totalInstalmentAllocated += instalmentAllocated;
      totalPenaltyAllocated += penaltyAllocated;

      lines.push({
        scheduleId: Number(row.id),
        installmentNumber: Number(row.installment_number),
        dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
        amountDue,
        amountAlreadyPaid: alreadyPaid,
        instalmentOutstanding,
        penaltyOutstanding,
        totalOutstanding: instalmentOutstanding + penaltyOutstanding,
        instalmentAllocated,
        penaltyAllocated,
        allocated,
        instalmentRemainingAfter,
        penaltyRemainingAfter,
        resultingStatus,
      });
    }

    return {
      loanId,
      amountReceived,
      totalAllocated: amountReceived - remaining,
      unallocated: remaining,
      totalInstalmentAllocated,
      totalPenaltyAllocated,
      policy,
      lines,
    };
  }

  async listAllocationsForPayment(
    manager: EntityManager,
    paymentId: number,
  ): Promise<
    Array<{
      scheduleId: number;
      installmentNumber: number | null;
      dueDate: string | null;
      amountApplied: number;
      instalmentApplied: number;
      penaltyApplied: number;
      previousStatus: string;
      newStatus: string;
      reversedAt: string | null;
    }>
  > {
    const rows = await manager.query(
      `SELECT a.schedule_id,
              a.amount_applied,
              COALESCE(a.instalment_applied, a.amount_applied, 0) AS instalment_applied,
              COALESCE(a.penalty_applied, 0) AS penalty_applied,
              a.previous_status,
              a.new_status,
              a.reversed_at,
              s.installment_number,
              s.due_date
         FROM payment_allocations a
         LEFT JOIN loan_schedules s ON s.id = a.schedule_id
        WHERE a.payment_id = $1
        ORDER BY a.id ASC`,
      [paymentId],
    );
    return (rows || []).map((r: any) => ({
      scheduleId: Number(r.schedule_id),
      installmentNumber: r.installment_number != null ? Number(r.installment_number) : null,
      dueDate: r.due_date ? String(r.due_date).slice(0, 10) : null,
      amountApplied: Math.round(Number(r.amount_applied)),
      instalmentApplied: Math.round(Number(r.instalment_applied)),
      penaltyApplied: Math.round(Number(r.penalty_applied)),
      previousStatus: String(r.previous_status),
      newStatus: String(r.new_status),
      reversedAt: r.reversed_at ? String(r.reversed_at) : null,
    }));
  }

  /**
   * Reverse all non-reversed allocations for a payment (called inside reverse transaction).
   */
  async reverseAllocations(manager: EntityManager, paymentId: number): Promise<number> {
    const allocations: any[] = await manager.query(
      `SELECT id, schedule_id, amount_applied,
              COALESCE(instalment_applied, amount_applied, 0) AS instalment_applied,
              COALESCE(penalty_applied, 0) AS penalty_applied,
              previous_status
         FROM payment_allocations
        WHERE payment_id = $1 AND reversed_at IS NULL
        ORDER BY id DESC`,
      [paymentId],
    );

    for (const alloc of allocations) {
      const instalmentApplied = Math.round(Number(alloc.instalment_applied));
      const penaltyApplied = Math.round(Number(alloc.penalty_applied));

      await manager.query(
        `UPDATE loan_schedules
            SET amount_paid    = GREATEST(0, ROUND(amount_paid::numeric) - $1),
                penalty_amount = ROUND(COALESCE(penalty_amount, 0)::numeric) + $2,
                status         = $3::loan_schedules_status_enum,
                updated_at     = NOW()
          WHERE id = $4`,
        [instalmentApplied, penaltyApplied, alloc.previous_status, alloc.schedule_id],
      );
    }

    if (allocations.length) {
      await manager.query(
        `UPDATE payment_allocations SET reversed_at = NOW()
          WHERE payment_id = $1 AND reversed_at IS NULL`,
        [paymentId],
      );
    }
    return allocations.length;
  }
}

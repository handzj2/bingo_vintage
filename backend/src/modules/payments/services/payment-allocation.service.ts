/**
 * PaymentAllocationService
 *
 * Distributes a payment amount across one or more loan schedule rows,
 * oldest installment first, and records exactly what it did in
 * payment_allocations so the exact reverse can be replayed later.
 *
 * Allocation order: installment_number ASC (oldest due first).
 *
 * Rules per installment:
 *   remaining >= (amountDue - alreadyPaid)  → mark PAID, consume full remainder
 *   remaining <  (amountDue - alreadyPaid)  → mark PARTIAL, stop (amount exhausted)
 *
 * Uses raw SQL for every schedule mutation and every payment_allocations
 * insert. NEVER calls repo.save() on a LoanSchedule — doing so would zero
 * out amount_due / due_date because TypeORM overwrites unloaded decimal
 * columns.
 *
 * Runs entirely against the EntityManager passed in by the caller — this is
 * required, not optional: PaymentsService.create() wraps payment creation,
 * balance update, and schedule allocation in a single QueryRunner
 * transaction. If this service opened its own connection instead (as the
 * previous version did, via this.scheduleRepo.manager), a failure after
 * allocation but before commit could leave the payment rolled back while
 * the schedule mutation stuck — the exact kind of balance/schedule
 * disagreement this whole fix exists to eliminate. Every write here must
 * commit or roll back atomically with the payment record.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';

/** Shape of each schedule row returned by the allocation query */
interface ScheduleRow {
  id: number;
  amount_due: string;   // PostgreSQL decimal columns come back as strings
  amount_paid: string;
  status: string;
}

/** Result summary returned to the caller for logging / audit */
export interface AllocationResult {
  loanId: number;
  originalAmount: number;
  allocated: number;
  remaining: number;
  rowsUpdated: number;
  detail: Array<{ scheduleId: number; applied: number; previousStatus: string; newStatus: string }>;
}

@Injectable()
export class PaymentAllocationService {
  private readonly logger = new Logger(PaymentAllocationService.name);

  /**
   * allocatePayment()
   *
   * Entry point called by PaymentsService.create() inside its existing
   * QueryRunner transaction.
   *
   * @param manager        - EntityManager bound to the caller's transaction
   * @param paymentId      - The already-saved Payment row this allocation belongs to
   * @param loanId         - The loan whose schedules should be updated
   * @param amount         - The payment amount to distribute (positive integer/decimal)
   * @param receiptNumber  - Written onto every schedule row touched, same as the
   *                         single-row path this replaces used to do
   * @param paymentMethod  - Written onto every schedule row touched
   * @param paymentDate    - Written onto every schedule row touched (paid_date)
   * @returns              AllocationResult for audit/logging
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
    const originalAmount = Math.round(Number(amount)); // integer arithmetic — avoids float drift

    if (originalAmount <= 0) {
      this.logger.warn(`allocatePayment called with non-positive amount ${originalAmount} for loan ${loanId} — skipping`);
      return this.emptyResult(loanId, originalAmount);
    }

    // ── Step 1: Fetch all unpaid / partially paid schedules, oldest first ──
    //   We include OVERDUE rows too — a late payment should still clear them.
    const rows: ScheduleRow[] = await manager.query(
      `SELECT id, amount_due, amount_paid, status
         FROM loan_schedules
        WHERE loan_id = $1
          AND status IN ('PENDING'::loan_schedules_status_enum, 'PARTIAL'::loan_schedules_status_enum, 'OVERDUE'::loan_schedules_status_enum)
        ORDER BY installment_number ASC`,
      [loanId],
    );

    if (!rows.length) {
      this.logger.log(`allocatePayment: no allocatable schedules for loan ${loanId}`);
      return this.emptyResult(loanId, originalAmount);
    }

    // ── Step 2: Walk through rows, consuming the payment amount ────────────
    let remaining = originalAmount;
    const detail: AllocationResult['detail'] = [];

    for (const row of rows) {
      if (remaining <= 0) break; // payment fully consumed — stop

      const amountDue   = Math.round(Number(row.amount_due));
      const alreadyPaid = Math.round(Number(row.amount_paid ?? 0));
      const stillOwed   = amountDue - alreadyPaid; // how much is left on this installment

      if (stillOwed <= 0) continue; // already fully paid row (defensive check)

      let applied: number;
      let newStatus: string;

      if (remaining >= stillOwed) {
        // This payment covers the entire remaining amount on this installment
        applied    = stillOwed;
        newStatus  = ScheduleStatus.PAID;
        remaining -= stillOwed;
      } else {
        // Partial coverage — consume all remaining payment, stop after this row
        applied    = remaining;
        newStatus  = ScheduleStatus.PARTIAL;
        remaining  = 0;
      }

      const newPaid = alreadyPaid + applied;
      const previousStatus = row.status;

      // ── Step 3: Persist schedule mutation via raw SQL (safe — never zeros
      //    out columns) — also sets receipt_number/payment_method/paid_date,
      //    matching what the single-row path this replaces used to set, so
      //    switching to multi-row allocation doesn't lose that data. ──────
      await manager.query(
        `UPDATE loan_schedules
            SET amount_paid    = $1,
                status          = $2::loan_schedules_status_enum,
                receipt_number  = $3,
                payment_method  = $4,
                paid_date       = $5,
                updated_at      = NOW()
          WHERE id = $6`,
        [newPaid, newStatus, receiptNumber, paymentMethod, paymentDate, row.id],
      );

      // ── Step 4: Record the allocation itself — this is what lets
      //    reversePayment() undo exactly this row later, instead of only
      //    knowing about a single schedule_id. ─────────────────────────────
      await manager.query(
        `INSERT INTO payment_allocations
           (payment_id, schedule_id, amount_applied, previous_status, new_status, created_at)
         VALUES ($1, $2, $3, $4::loan_schedules_status_enum, $5::loan_schedules_status_enum, NOW())`,
        [paymentId, row.id, applied, previousStatus, newStatus],
      );

      detail.push({ scheduleId: row.id, applied, previousStatus, newStatus });

      this.logger.debug(
        `Payment ${paymentId} | loan ${loanId} | schedule ${row.id} | applied ${applied} | ` +
        `paid ${alreadyPaid}→${newPaid}/${amountDue} | status ${previousStatus} → ${newStatus}`,
      );
    }

    const allocated = originalAmount - remaining;

    this.logger.log(
      `allocatePayment complete — payment=${paymentId} loan=${loanId} | ` +
      `amount=${originalAmount} | allocated=${allocated} | remaining=${remaining} | ` +
      `rows=${detail.length}`,
    );

    return {
      loanId,
      originalAmount,
      allocated,
      remaining,
      rowsUpdated: detail.length,
      detail,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private emptyResult(loanId: number, amount: number): AllocationResult {
    return { loanId, originalAmount: amount, allocated: 0, remaining: amount, rowsUpdated: 0, detail: [] };
  }
}
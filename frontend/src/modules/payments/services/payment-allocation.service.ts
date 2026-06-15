/**
 * PaymentAllocationService
 *
 * Automatically distributes a payment amount across one or more loan schedule
 * rows when no explicit scheduleId is provided by the caller.
 *
 * Allocation order: oldest due-date first (installment_number ASC).
 *
 * Rules per installment:
 *   remaining >= (amountDue - alreadyPaid)  → mark PAID, consume full remainder
 *   remaining <  (amountDue - alreadyPaid)  → mark PARTIAL, stop (amount exhausted)
 *
 * Uses raw SQL UPDATE for every schedule mutation.
 * NEVER calls repo.save() on a LoanSchedule — doing so would zero out
 * amount_due / due_date because TypeORM overwrites unloaded decimal columns.
 *
 * This service is intentionally narrow in scope: it only touches
 * loan_schedules rows. Loan balance updates are handled upstream in
 * PaymentsService.create() and must not be repeated here.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanSchedule } from '../../schedules/entities/schedule.entity';

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
  detail: Array<{ scheduleId: number; applied: number; newStatus: string }>;
}

@Injectable()
export class PaymentAllocationService {
  private readonly logger = new Logger(PaymentAllocationService.name);

  constructor(
    @InjectRepository(LoanSchedule)
    private readonly scheduleRepo: Repository<LoanSchedule>,
  ) {}

  /**
   * allocatePayment()
   *
   * Entry point called by PaymentsService.create() when no scheduleId
   * was supplied with the payment.
   *
   * @param loanId  - The loan whose schedules should be updated
   * @param amount  - The payment amount to distribute (positive integer/decimal)
   * @returns       AllocationResult for audit/logging
   */
  async allocatePayment(loanId: number, amount: number): Promise<AllocationResult> {
    const originalAmount = Math.round(Number(amount)); // integer arithmetic — avoids float drift

    if (originalAmount <= 0) {
      this.logger.warn(`allocatePayment called with non-positive amount ${originalAmount} for loan ${loanId} — skipping`);
      return this.emptyResult(loanId, originalAmount);
    }

    // ── Step 1: Fetch all unpaid / partially paid schedules, oldest first ──
    //   We include OVERDUE rows too — a late payment should still clear them.
    const rows: ScheduleRow[] = await this.scheduleRepo.manager.query(
      `SELECT id, amount_due, amount_paid, status
         FROM loan_schedules
        WHERE loan_id = $1
          AND status IN ('PENDING'::schedule_status_enum, 'PARTIAL'::schedule_status_enum, 'OVERDUE'::schedule_status_enum)
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
        newStatus  = 'PAID';
        remaining -= stillOwed;
      } else {
        // Partial coverage — consume all remaining payment, stop after this row
        applied    = remaining;
        newStatus  = 'PARTIAL';
        remaining  = 0;
      }

      const newPaid = alreadyPaid + applied;

      // ── Step 3: Persist via raw SQL (safe — never zeros out columns) ──────
      await this.scheduleRepo.manager.query(
        `UPDATE loan_schedules
            SET amount_paid = $1,
                status      = $2::schedule_status_enum,
                updated_at  = NOW()
          WHERE id = $3`,
        [newPaid, newStatus, row.id],
      );

      detail.push({ scheduleId: row.id, applied, newStatus });

      this.logger.debug(
        `Loan ${loanId} | schedule ${row.id} | applied ${applied} | ` +
        `paid ${alreadyPaid}→${newPaid}/${amountDue} | status → ${newStatus}`,
      );
    }

    const allocated = originalAmount - remaining;

    this.logger.log(
      `allocatePayment complete — loan ${loanId} | ` +
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

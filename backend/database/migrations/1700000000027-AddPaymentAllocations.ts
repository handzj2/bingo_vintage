import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPaymentAllocations
 *
 * Problem this fixes:
 *   PaymentsService.create() currently applies an entire payment amount to
 *   a single loan_schedules row (see applyPaymentToSchedule / resolveScheduleId
 *   in payments.service.ts). A lump-sum or backdated payment that should
 *   cover several installments instead clears (or partially fills) only the
 *   oldest one — the rest silently discard the excess. loan.balance is
 *   reduced correctly, but loan_schedules rows are left OVERDUE/PARTIAL
 *   forever, which is what ArrearsCalculationJob reads to compute
 *   total_arrears/days_in_arrears. Net effect: correct balance, phantom
 *   arrears.
 *
 *   A correct fix requires walking multiple loan_schedules rows per payment
 *   (PaymentAllocationService.allocatePayment() already does this — it is
 *   just never wired in). Once a single payment can touch N schedule rows,
 *   payments.schedule_id (a single FK) can no longer describe what
 *   happened, and reversePayment() has nothing to walk back for a
 *   multi-row allocation.
 *
 * Fix:
 *   payment_allocations records one row per (payment, schedule) pair that
 *   an allocation touched, with the exact amount applied and the status
 *   transition, so reversal can undo precisely what allocation did —
 *   symmetric with how allocation itself works, not a JSON approximation
 *   of it.
 *
 * Backward compatibility:
 *   Additive only. No existing table is altered. Payments recorded before
 *   this migration have no rows here — reversePayment() must keep falling
 *   back to the existing single-schedule_id reversal path when a payment
 *   has no payment_allocations rows.
 */
export class AddPaymentAllocations1700000000027 implements MigrationInterface {
  name = 'AddPaymentAllocations1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id               SERIAL PRIMARY KEY,
        payment_id       INTEGER NOT NULL
                           REFERENCES payments(id) ON DELETE CASCADE,
        schedule_id      INTEGER NOT NULL
                           REFERENCES loan_schedules(id) ON DELETE CASCADE,
        amount_applied   NUMERIC(12,2) NOT NULL,
        previous_status  loan_schedules_status_enum NOT NULL,
        new_status       loan_schedules_status_enum NOT NULL,
        reversed_at      TIMESTAMP NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Lookup by payment — used by reversePayment() to find everything a
    // payment touched.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id
        ON payment_allocations(payment_id)
    `);

    // Lookup by schedule — used for the "which payments cleared installment
    // X" audit/reporting query.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_schedule_id
        ON payment_allocations(schedule_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_allocations_schedule_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_allocations_payment_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_allocations`);
  }
}
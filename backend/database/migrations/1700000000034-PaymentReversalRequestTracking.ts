import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reversal request tracking.
 *
 * Before: requestReversal() wrote the REQUESTER into payments.reversed_by and
 * the rejection text over payments.reversal_reason, so the UI could not show who
 * asked / why, and a rejected payment kept a misleading "reversed_by".
 *
 * After: requester, decider and rejection reason have their own columns.
 * Existing in-flight rows are backfilled so nothing in the queue is lost.
 */
export class PaymentReversalRequestTracking1700000000034 implements MigrationInterface {
  name = 'PaymentReversalRequestTracking1700000000034';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS reversal_requested_by  varchar   NULL,
        ADD COLUMN IF NOT EXISTS reversal_requested_at  timestamp NULL,
        ADD COLUMN IF NOT EXISTS reversal_decided_by    varchar   NULL,
        ADD COLUMN IF NOT EXISTS reversal_decided_at    timestamp NULL,
        ADD COLUMN IF NOT EXISTS reversal_reject_reason text      NULL
    `);

    // PENDING / REJECTED rows that were never actually reversed: reversed_by held the requester.
    await q.query(`
      UPDATE payments
         SET reversal_requested_by = reversed_by,
             reversal_requested_at = COALESCE(reversal_requested_at, updated_at),  -- keeps old requests in age order (NULLs sort last)
             reversed_by           = NULL
       WHERE reversal_status IN ('PENDING', 'REJECTED')
         AND reversed_at IS NULL
         AND reversed_by IS NOT NULL
         AND reversal_requested_by IS NULL
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_reversal_pending
        ON payments (tenant_id, reversal_requested_at)
        WHERE reversal_status = 'PENDING'
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_payments_reversal_pending`);
    await q.query(`
      UPDATE payments SET reversed_by = reversal_requested_by
       WHERE reversal_status IN ('PENDING','REJECTED') AND reversed_at IS NULL AND reversed_by IS NULL
    `);
    await q.query(`
      ALTER TABLE payments
        DROP COLUMN IF EXISTS reversal_reject_reason,
        DROP COLUMN IF EXISTS reversal_decided_at,
        DROP COLUMN IF EXISTS reversal_decided_by,
        DROP COLUMN IF EXISTS reversal_requested_at,
        DROP COLUMN IF EXISTS reversal_requested_by
    `);
  }
}

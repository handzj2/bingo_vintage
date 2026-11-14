import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reversal after drawer close.
 *
 * A payment reversed once its drawer is closed/reconciled must not change that
 * drawer's closed figures. The refund is carried into the branch's next drawer
 * (the one open at reversal time, otherwise the next one opened) and deducted
 * from THAT drawer's expected cash.
 *
 *   reversed_after_close     true when the payment's own drawer was already closed
 *   reversal_carry_drawer_id drawer the refund is deducted from (NULL = waiting for next open)
 */
export class ReversalAfterDrawerClose1700000000035 implements MigrationInterface {
  name = 'ReversalAfterDrawerClose1700000000035';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS reversed_after_close     boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS reversal_carry_drawer_id integer NULL
    `);
    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_reversal_carry
        ON payments (tenant_id, reversal_carry_drawer_id)
        WHERE reversed_after_close = true
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_payments_reversal_carry`);
    await q.query(`
      ALTER TABLE payments
        DROP COLUMN IF EXISTS reversal_carry_drawer_id,
        DROP COLUMN IF EXISTS reversed_after_close
    `);
  }
}

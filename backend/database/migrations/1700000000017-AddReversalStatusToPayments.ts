import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tech Debt Item 1 — Add reversal_status column to payments.
 *
 * Problem: The codebase used policyReference (a data column) as a
 * state flag, writing 'REVERSAL_PENDING' to query for pending requests.
 * This conflated two concerns, made queries fragile, and broke the
 * semantic meaning of policyReference.
 *
 * Fix: Dedicated reversal_status column with a proper PostgreSQL enum.
 * policyReference returns to being a pure data/audit field.
 *
 * Existing rows: NULL (no reversal in flight) — correct default.
 */
export class AddReversalStatusToPayments1700000000017 implements MigrationInterface {
  name = 'AddReversalStatusToPayments1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE reversal_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Add column — nullable, no default (NULL = no reversal in flight)
    await queryRunner.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS reversal_status reversal_status_enum NULL
    `);

    // Backfill: any row where policyReference = 'REVERSAL_PENDING' was a pending request
    await queryRunner.query(`
      UPDATE payments
         SET reversal_status = 'PENDING'::reversal_status_enum
       WHERE policy_reference = 'REVERSAL_PENDING'
         AND reversal_status IS NULL
    `);

    // Index for the admin pending-requests query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_reversal_status
        ON payments(reversal_status)
       WHERE reversal_status IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_reversal_status`);
    // Clear all reversal_status values first so the type has no dependents
    await queryRunner.query(`UPDATE payments SET reversal_status = NULL WHERE reversal_status IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE payments DROP COLUMN IF EXISTS reversal_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS reversal_status_enum`);
  }
}

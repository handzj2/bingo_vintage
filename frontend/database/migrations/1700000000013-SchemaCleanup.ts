import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1, Tasks 1.3, 1.5, 1.6 — Schema cleanup
 *
 * 1.3: Add updated_at to cash_drawers if missing (databases built from init.sql
 *      may lack it even though Migration 001 includes it in the DDL).
 *
 * 1.5: Add WAIVED value to schedule_status_enum.
 *      LoanSchedule entity declares WAIVED; without this, any INSERT/UPDATE
 *      setting status='WAIVED' throws: invalid input value for enum.
 *
 * 1.6: Drop legacy `role` VARCHAR column from users if it still exists.
 *      The entity no longer maps it; having it in the DB is harmless but
 *      confusing and wastes space.
 *
 * All operations are idempotent (IF NOT EXISTS / IF EXISTS / DO $$).
 */
export class SchemaCleanup1700000000013 implements MigrationInterface {
  name = 'SchemaCleanup1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1.3 — cash_drawers.updated_at
    await queryRunner.query(`
      ALTER TABLE cash_drawers
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now()
    `);

    // 1.5 — Add WAIVED to schedule_status_enum (idempotent guard via DO block)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
           WHERE enumlabel = 'WAIVED'
             AND enumtypid = 'schedule_status_enum'::regtype
        ) THEN
          ALTER TYPE schedule_status_enum ADD VALUE 'WAIVED';
        END IF;
      END
      $$
    `);

    // 1.6 — Drop legacy role column from users (IF EXISTS — safe if already gone)
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS role
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add role column (needed for rollback compatibility)
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'cashier'
    `);
    // Note: PostgreSQL does not support removing enum values.
    // WAIVED cannot be removed from schedule_status_enum in down().
  }
}

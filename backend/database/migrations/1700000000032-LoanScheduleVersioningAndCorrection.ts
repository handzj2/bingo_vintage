import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 032 — Loan schedule versioning + correction audit support
 *
 * Enables safe rescheduling / term correction without deleting payment history:
 * - loan_schedules gains version + is_active + superseded_at
 * - New loan_corrections table records every terms/balance/reschedule action
 * - payment_allocations can reference the schedule version they were applied under
 */
export class LoanScheduleVersioningAndCorrection1700000000032 implements MigrationInterface {
  name = 'LoanScheduleVersioningAndCorrection1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Version columns on loan_schedules ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE loan_schedules
        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS superseded_by_version INTEGER NULL
    `);

    // Backfill: all existing rows are version 1 and active
    await queryRunner.query(`
      UPDATE loan_schedules
         SET version = 1, is_active = true
       WHERE version IS NULL OR version = 0
    `);

    // ── 2. loan_corrections audit table ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loan_corrections (
        id                  SERIAL PRIMARY KEY,
        tenant_id           INTEGER NOT NULL,
        branch_id           INTEGER NULL,
        loan_id             INTEGER NOT NULL REFERENCES loans(id),
        correction_type     VARCHAR(40) NOT NULL,  -- TERMS | RESCHEDULE | BALANCE | SCHEDULE
        previous_snapshot   JSONB NOT NULL,
        new_snapshot        JSONB NOT NULL,
        reason              TEXT NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'APPLIED', -- PENDING | APPLIED | REJECTED
        requested_by_id     INTEGER NOT NULL,
        approved_by_id      INTEGER NULL,
        applied_at          TIMESTAMPTZ NULL,
        schedule_version    INTEGER NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_corrections_loan
        ON loan_corrections (loan_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_corrections_tenant
        ON loan_corrections (tenant_id, status)
    `);

    // ── 3. Optional link from allocations to schedule version ─────────────────
    await queryRunner.query(`
      ALTER TABLE payment_allocations
        ADD COLUMN IF NOT EXISTS schedule_version INTEGER NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payment_allocations DROP COLUMN IF EXISTS schedule_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS loan_corrections CASCADE`);
    await queryRunner.query(`
      ALTER TABLE loan_schedules
        DROP COLUMN IF EXISTS version,
        DROP COLUMN IF EXISTS is_active,
        DROP COLUMN IF EXISTS superseded_at,
        DROP COLUMN IF EXISTS superseded_by_version
    `);
  }
}

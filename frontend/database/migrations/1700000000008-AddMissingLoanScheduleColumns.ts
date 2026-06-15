import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds ALL columns that the LoanSchedule entity defines but that may be
 * absent when the table was created outside the FoundationSchema migration.
 * Every ADD COLUMN uses IF NOT EXISTS — safe to run multiple times.
 */
export class AddMissingLoanScheduleColumns1700000000008 implements MigrationInterface {
  name = 'AddMissingLoanScheduleColumns1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_schedules"
        ADD COLUMN IF NOT EXISTS "paid_date"             TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "receipt_number"        VARCHAR,
        ADD COLUMN IF NOT EXISTS "payment_method"        VARCHAR,
        ADD COLUMN IF NOT EXISTS "payment_notes"         TEXT,
        ADD COLUMN IF NOT EXISTS "overdue_days"          INTEGER       NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "late_fee_amount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "penalty_amount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "last_penalty_applied"  DATE,
        ADD COLUMN IF NOT EXISTS "tenant_id"             INTEGER       DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "branch_id"             INTEGER       DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_schedules"
        DROP COLUMN IF EXISTS "paid_date",
        DROP COLUMN IF EXISTS "receipt_number",
        DROP COLUMN IF EXISTS "payment_method",
        DROP COLUMN IF EXISTS "payment_notes",
        DROP COLUMN IF EXISTS "overdue_days",
        DROP COLUMN IF EXISTS "late_fee_amount",
        DROP COLUMN IF EXISTS "penalty_amount",
        DROP COLUMN IF EXISTS "last_penalty_applied",
        DROP COLUMN IF EXISTS "tenant_id",
        DROP COLUMN IF EXISTS "branch_id"
    `);
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align loan_alerts table with LoanAlert entity.
 *
 * FoundationSchema created a minimal loan_alerts table.
 * The entity and SchedulesService expect the full operational shape.
 * Additive and idempotent — does not drop existing rows.
 */
export class AlignLoanAlertsWithEntity1700000000029 implements MigrationInterface {
  name = 'AlignLoanAlertsWithEntity1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'schedule_id'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN schedule_id INTEGER NULL
            REFERENCES loan_schedules(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'severity'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN severity VARCHAR(20) NOT NULL DEFAULT 'medium';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'title'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'days_overdue'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN days_overdue INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'amount_due'
        ) THEN
          ALTER TABLE loan_alerts
            ADD COLUMN amount_due DECIMAL(12,2) NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'resolved_at'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN resolved_at TIMESTAMP NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'resolved_by'
        ) THEN
          ALTER TABLE loan_alerts ADD COLUMN resolved_by VARCHAR NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_alerts' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE loan_alerts
            ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT now();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE loan_alerts
         SET title = LEFT(COALESCE(NULLIF(message, ''), alert_type), 255)
       WHERE title IS NULL OR title = '';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_alerts_severity ON loan_alerts(severity);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_alerts_unresolved
        ON loan_alerts(is_resolved) WHERE is_resolved = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loan_alerts_unresolved`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loan_alerts_severity`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS resolved_by`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS resolved_at`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS amount_due`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS days_overdue`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS title`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS severity`);
    await queryRunner.query(`ALTER TABLE loan_alerts DROP COLUMN IF EXISTS schedule_id`);
  }
}

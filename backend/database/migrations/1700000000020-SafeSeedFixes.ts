// patch 2026-06-16
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 020 — SafeSeedFixes
 *
 * Fixes all seed migrations that failed on Railway because they hardcoded
 * tenant_id = 1 but production DB assigned id = 2.
 *
 * Problems fixed:
 *   004 — app_settings INSERT still used ON CONFLICT (key, tenant_id) correctly
 *         but the down() method uses hardcoded id=1 (non-destructive issue only)
 *   015 — expense_categories seeded with tenant_id = 1 (missed tenant id=2)
 *   017 — reversal_status_enum type name conflict with payments_reversal_status_enum
 *   NEW — ensure branches.manager_name and branches.contact_phone exist
 *         (defined in migration 001 but may be missing on older DBs)
 *
 * All operations are fully idempotent — safe to run on any existing database.
 */
export class SafeSeedFixes1700000000020 implements MigrationInterface {
  name = 'SafeSeedFixes1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── STEP 1: Ensure branches has manager_name and contact_phone ────────────
    // These are used by the superadmin branch creation portal.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='branches' AND column_name='manager_name') THEN
          ALTER TABLE branches ADD COLUMN manager_name VARCHAR;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='branches' AND column_name='contact_phone') THEN
          ALTER TABLE branches ADD COLUMN contact_phone VARCHAR;
        END IF;
      END $$;
    `);

    // ── STEP 2: Backfill expense_categories for ALL tenants that have none ────
    // Migration 015 only inserted for tenant_id=1. Any tenant with id != 1
    // never got their expense categories seeded. This inserts for every
    // active tenant that is missing the standard categories.
    await queryRunner.query(`
      INSERT INTO expense_categories (tenant_id, name, description, created_at)
      SELECT
        t.id,
        c.name,
        c.description,
        now()
      FROM tenants t
      CROSS JOIN (VALUES
        ('Utilities',   'Electricity, water, internet'),
        ('Rent',        'Office or branch rent'),
        ('Maintenance', 'Bike and office maintenance'),
        ('Salaries',    'Staff salaries and wages'),
        ('Transport',   'Fuel, transport, logistics'),
        ('Office',      'Stationery and office supplies'),
        ('Marketing',   'Advertising and promotions'),
        ('Other',       'Miscellaneous expenses')
      ) AS c(name, description)
      WHERE t.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM expense_categories ec
        WHERE ec.tenant_id = t.id AND ec.name = c.name
      );
    `);

    // ── STEP 3: Fix reversal_status enum type mismatch ───────────────────────
    // Migration 017 created 'reversal_status_enum' but the payments column
    // is typed as 'payments_reversal_status_enum' (TypeORM naming convention).
    // This ensures both enum types exist and the column uses the correct one.
    await queryRunner.query(`
      DO $$ BEGIN
        -- Create payments_reversal_status_enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payments_reversal_status_enum') THEN
          CREATE TYPE payments_reversal_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        END IF;

        -- Add reversal_status column using the correct enum type if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payments' AND column_name='reversal_status') THEN
          ALTER TABLE payments
            ADD COLUMN reversal_status payments_reversal_status_enum NULL;
        END IF;

        -- If column exists but uses the wrong enum type, cast it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns c
          JOIN pg_attribute a ON a.attname = c.column_name
          JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = 'payments'
          JOIN pg_type t ON t.oid = a.atttypid AND t.typname = 'reversal_status_enum'
          WHERE c.table_name = 'payments' AND c.column_name = 'reversal_status'
        ) THEN
          ALTER TABLE payments
            ALTER COLUMN reversal_status TYPE payments_reversal_status_enum
            USING reversal_status::text::payments_reversal_status_enum;
        END IF;
      END $$;
    `);

    // ── STEP 4: Backfill app_settings — only if tenant_id column exists ────────
    // Migration 021 adds tenant_id to app_settings when missing.
    // If 021 has not run yet (e.g. running in order), skip this step safely.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'app_settings' AND column_name = 'tenant_id'
        ) THEN
          INSERT INTO app_settings (key, value, tenant_id, created_at, updated_at)
          SELECT s.key, s.value, t.id, now(), now()
          FROM tenants t
          CROSS JOIN (VALUES
            ('LOAN_INTEREST_RATE',       '0.15'),
            ('loan.processing_fee',      '0'),
            ('loan.default_term_months', '12'),
            ('LOAN_LATE_FEE_RATE',       '0.05')
          ) AS s(key, value)
          WHERE t.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM app_settings a
            WHERE a.tenant_id = t.id AND a.key = s.key
          );
        END IF;
      END $$;
    `);

    // ── STEP 5: Backfill RBAC permissions for all tenant roles ───────────────
    // Migration 019 seeds role_permissions but only for roles that existed
    // at the time. Any new tenant's roles get permissions seeded here.
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE (
        (r.name = 'admin'        AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view','loan.approve',
          'payment.create','payment.view','payment.reverse',
          'expense.create','expense.approve',
          'drawer.manage','report.view','settings.manage','user.manage'
        ))
        OR
        (r.name = 'manager'      AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view','loan.approve',
          'payment.create','payment.view',
          'expense.create','expense.approve',
          'drawer.manage','report.view'
        ))
        OR
        (r.name = 'cashier'      AND p.code IN (
          'client.view','payment.create','payment.view',
          'expense.create','drawer.manage'
        ))
        OR
        (r.name IN ('loan_officer','credit_officer') AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view','payment.view'
        ))
        OR
        (r.name = 'agent'        AND p.code IN (
          'client.create','client.view','loan.create','loan.view'
        ))
      )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration only backfills data and adds columns — no destructive rollback needed.
    // Column drops are intentionally omitted to avoid data loss on rollback.
    await queryRunner.query(`
      SELECT 1; -- intentional no-op: backfill data is safe to keep on rollback
    `);
  }
}

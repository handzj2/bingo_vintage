import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 021 — AppSettingsTenantSupport
 *
 * ARCHITECTURAL DECISION: Middle path
 *
 * Context:
 *   Production app_settings was created from init.sql (no tenant_id column).
 *   Migration 001 used CREATE TABLE IF NOT EXISTS — was a no-op against the
 *   existing table. Migrations 004/020 assumed tenant_id existed → crashed.
 *
 * Why not Option A (full tenant-aware now):
 *   SettingsService is a singleton with a global in-memory cache.
 *   PenaltyCalculationJob reads LATE_FEE_DAILY once and applies it across
 *   ALL tenants' overdue schedules in a batch cron job — no per-tenant context.
 *   LoansService reads LOAN_INTEREST_RATE globally.
 *   Making these tenant-aware requires threading tenantId through all three
 *   callers including the cron job, and getting the cron job wrong means
 *   silently applying one tenant's rate to another's loans.
 *
 * Why not Option B (keep global, no column):
 *   Blocks migration 020 which backfills settings per-tenant.
 *   Blocks superadmin portal from seeding settings during tenant onboarding.
 *   Creates permanent inconsistency with rest of schema (all other tables are
 *   tenant-scoped).
 *
 * What this migration does (middle path):
 *   1. Adds tenant_id as NULLABLE — no constraint change, no NOT NULL
 *   2. Adds description column if missing (init.sql had it, 001 did not)
 *   3. Populates existing rows with the Bingo Vintage tenant id (by slug)
 *   4. Adds UNIQUE(key, tenant_id) constraint — replaces UNIQUE(key) if present
 *   5. Adds FK to tenants ON DELETE CASCADE
 *   6. Backfills defaults for tenants that have none
 *
 * SettingsService.onModuleInit() still works:
 *   It inserts rows with no tenant_id — these become NULL tenant_id rows
 *   which represent global defaults. findOne({ where: { key } }) still
 *   returns the first match, which is correct behaviour for global settings.
 *
 * Future Option A path:
 *   When ready to make settings fully tenant-aware:
 *   1. Add tenantId field to AppSetting entity
 *   2. Update SettingsService.getSetting(key, tenantId) to filter by tenant
 *   3. Thread tenantId through loans.service.ts and penalty job
 *   4. Update onModuleInit to seed per tenant, not globally
 *   The schema is already ready — no further migration needed.
 */
export class AppSettingsTenantSupport1700000000021 implements MigrationInterface {
  name = 'AppSettingsTenantSupport1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── STEP 1: Add tenant_id as NULLABLE ────────────────────────────────────
    // NULLABLE intentionally — SettingsService.onModuleInit inserts global
    // defaults with no tenant_id (NULL = global). Adding NOT NULL here would
    // crash the app on every boot.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'app_settings' AND column_name = 'tenant_id'
        ) THEN
          ALTER TABLE app_settings ADD COLUMN tenant_id INTEGER;
        END IF;
      END $$;
    `);

    // ── STEP 2: Add description column if missing ─────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'app_settings' AND column_name = 'description'
        ) THEN
          ALTER TABLE app_settings ADD COLUMN description VARCHAR;
        END IF;
      END $$;
    `);

    // ── STEP 3: Populate tenant_id for existing rows ──────────────────────────
    // Assigns Bingo Vintage's id to all rows that currently have no tenant.
    // Uses slug lookup — works regardless of what id the sequence assigned.
    await queryRunner.query(`
      UPDATE app_settings
      SET tenant_id = (
        SELECT id FROM tenants WHERE slug = 'bingo-vintage' LIMIT 1
      )
      WHERE tenant_id IS NULL
        AND EXISTS (SELECT 1 FROM tenants WHERE slug = 'bingo-vintage');
    `);

    // ── STEP 4: Replace UNIQUE(key) with UNIQUE(key, tenant_id) ──────────────
    // Drop old single-column unique constraint on key if it exists
    await queryRunner.query(`
      DO $$
      DECLARE v_con TEXT;
      BEGIN
        SELECT c.conname INTO v_con
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid AND cl.relname = 'app_settings'
        JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'u' AND a.attname = 'key'
          AND array_length(c.conkey, 1) = 1
        LIMIT 1;

        IF v_con IS NOT NULL THEN
          EXECUTE 'ALTER TABLE app_settings DROP CONSTRAINT ' || quote_ident(v_con);
        END IF;
      END $$;
    `);

    // Add composite unique constraint
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'app_settings_key_tenant_unique'
            AND conrelid = 'app_settings'::regclass
        ) THEN
          ALTER TABLE app_settings
            ADD CONSTRAINT app_settings_key_tenant_unique UNIQUE (key, tenant_id);
        END IF;
      END $$;
    `);

    // ── STEP 5: Add FK to tenants if missing ─────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_app_settings_tenant'
            AND conrelid = 'app_settings'::regclass
        ) THEN
          ALTER TABLE app_settings
            ADD CONSTRAINT fk_app_settings_tenant
            FOREIGN KEY (tenant_id)
            REFERENCES tenants(id)
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // ── STEP 6: Backfill defaults for tenants that have no settings ───────────
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, tenant_id, created_at, updated_at)
      SELECT s.key, s.value, t.id, now(), now()
      FROM tenants t
      CROSS JOIN (VALUES
        ('LOAN_INTEREST_RATE',       '0.15'),
        ('LATE_FEE_DAILY',           '1000'),
        ('loan.processing_fee',      '0'),
        ('loan.default_term_months', '12'),
        ('LOAN_LATE_FEE_RATE',       '0.05')
      ) AS s(key, value)
      WHERE t.is_active = true
        AND t.slug != 'superadmin'
        AND NOT EXISTS (
          SELECT 1 FROM app_settings a
          WHERE a.tenant_id = t.id AND a.key = s.key
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_settings
        DROP CONSTRAINT IF EXISTS fk_app_settings_tenant,
        DROP CONSTRAINT IF EXISTS app_settings_key_tenant_unique;
    `);
    // Leave tenant_id column in place on rollback to avoid data loss
  }
}

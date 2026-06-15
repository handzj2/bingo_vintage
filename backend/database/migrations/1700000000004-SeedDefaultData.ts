/**
 * Migration 004 — SeedDefaultData
 * Patched 2026-06-15: idempotency fix for environments where tenant id != 1
 *
 * Root cause: original guards used WHERE id = 1 which failed on Railway
 * because the tenant was created with id = 2 by the sequence.
 * The slug unique constraint fired on retry because the data existed
 * under a different id.
 *
 * Fix: all guards now check by slug/name instead of hardcoded id.
 * All inserts omit the id column and let PostgreSQL assign it.
 * Roles and settings look up tenant dynamically via slug.
 * This migration is now fully idempotent regardless of id sequence.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultData1700000000004 implements MigrationInterface {
  name = 'SeedDefaultData1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── SELF-HEALING: Ensure all required columns exist ──────────────────────
    // This guarantees the migration runs correctly even if previous migrations
    // (e.g., FoundationSchema) didn’t create every column.
    await queryRunner.query(`
      DO $$ BEGIN
        -- tenants
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tenants' AND column_name='slug') THEN
          ALTER TABLE tenants ADD COLUMN slug varchar;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tenants' AND column_name='description') THEN
          ALTER TABLE tenants ADD COLUMN description text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tenants' AND column_name='is_active') THEN
          ALTER TABLE tenants ADD COLUMN is_active boolean DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tenants' AND column_name='created_at') THEN
          ALTER TABLE tenants ADD COLUMN created_at timestamp DEFAULT now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='tenants' AND column_name='updated_at') THEN
          ALTER TABLE tenants ADD COLUMN updated_at timestamp DEFAULT now();
        END IF;

        -- branches
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='branches' AND column_name='location') THEN
          ALTER TABLE branches ADD COLUMN location varchar;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='branches' AND column_name='is_active') THEN
          ALTER TABLE branches ADD COLUMN is_active boolean DEFAULT true;
        END IF;

        -- roles
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='roles' AND column_name='is_default') THEN
          ALTER TABLE roles ADD COLUMN is_default boolean DEFAULT false;
        END IF;
      END $$;
    `);

    // ── DEFAULT TENANT ──────────────────────────────────────────────────────
    // Uses WHERE NOT EXISTS to avoid any constraint dependency.
    await queryRunner.query(`
      INSERT INTO tenants (name, slug, description, is_active, created_at, updated_at)
      SELECT 'Bingo Vintage', 'bingo-vintage', 'Motorcycle Loan Management', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'bingo-vintage');
    `);
    await queryRunner.query(`SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));`);

    // ── DEFAULT BRANCH ──────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO branches (tenant_id, name, location, is_active, created_at, updated_at)
      SELECT t.id, 'Main Branch', 'Kampala', true, now(), now()
      FROM tenants t WHERE t.slug = 'bingo-vintage'
      AND NOT EXISTS (
        SELECT 1 FROM branches b
        JOIN tenants t2 ON t2.id = b.tenant_id
        WHERE t2.slug = 'bingo-vintage' AND b.name = 'Main Branch'
      );
    `);
    await queryRunner.query(`SELECT setval('branches_id_seq', (SELECT MAX(id) FROM branches));`);

    // ── DEFAULT ROLES ───────────────────────────────────────────────────────
    // Single inserts with explicit NOT EXISTS to avoid any constraint assumptions.
    await queryRunner.query(`
      INSERT INTO roles (tenant_id, name, description, is_default, created_at, updated_at)
      SELECT t.id, 'admin',   'System administrator with full access',    false, now(), now()
      FROM tenants t WHERE t.slug = 'bingo-vintage'
      AND NOT EXISTS (SELECT 1 FROM roles r JOIN tenants t2 ON t2.id = r.tenant_id
        WHERE t2.slug = 'bingo-vintage' AND r.name = 'admin');
    `);
    await queryRunner.query(`
      INSERT INTO roles (tenant_id, name, description, is_default, created_at, updated_at)
      SELECT t.id, 'manager', 'Branch manager with approval permissions', false, now(), now()
      FROM tenants t WHERE t.slug = 'bingo-vintage'
      AND NOT EXISTS (SELECT 1 FROM roles r JOIN tenants t2 ON t2.id = r.tenant_id
        WHERE t2.slug = 'bingo-vintage' AND r.name = 'manager');
    `);
    await queryRunner.query(`
      INSERT INTO roles (tenant_id, name, description, is_default, created_at, updated_at)
      SELECT t.id, 'agent',   'Loan agent — create and track loans',      false, now(), now()
      FROM tenants t WHERE t.slug = 'bingo-vintage'
      AND NOT EXISTS (SELECT 1 FROM roles r JOIN tenants t2 ON t2.id = r.tenant_id
        WHERE t2.slug = 'bingo-vintage' AND r.name = 'agent');
    `);
    await queryRunner.query(`
      INSERT INTO roles (tenant_id, name, description, is_default, created_at, updated_at)
      SELECT t.id, 'cashier', 'Cashier — record payments and expenses',   true,  now(), now()
      FROM tenants t WHERE t.slug = 'bingo-vintage'
      AND NOT EXISTS (SELECT 1 FROM roles r JOIN tenants t2 ON t2.id = r.tenant_id
        WHERE t2.slug = 'bingo-vintage' AND r.name = 'cashier');
    `);

    // ── DEFAULT APP SETTINGS ───────────────────────────────────────────────
    // The app_settings table has a unique constraint on "key" alone, not on (key, tenant_id).
    // Using ON CONFLICT (key) matches the actual constraint and makes the insert idempotent.
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, tenant_id, created_at, updated_at)
      VALUES
        ('LOAN_INTEREST_RATE',      '0.15', (SELECT id FROM tenants WHERE slug='bingo-vintage' LIMIT 1), now(), now()),
        ('loan.processing_fee',     '0',    (SELECT id FROM tenants WHERE slug='bingo-vintage' LIMIT 1), now(), now()),
        ('loan.default_term_months','12',   (SELECT id FROM tenants WHERE slug='bingo-vintage' LIMIT 1), now(), now()),
        ('LOAN_LATE_FEE_RATE',      '0.05', (SELECT id FROM tenants WHERE slug='bingo-vintage' LIMIT 1), now(), now())
      ON CONFLICT (key) DO NOTHING;  -- constraint is on key alone, not (key, tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert seed data – intended only for dev/test environments.
    await queryRunner.query(`DELETE FROM app_settings  WHERE tenant_id = 1;`);
    await queryRunner.query(`DELETE FROM roles          WHERE tenant_id = 1;`);
    await queryRunner.query(`DELETE FROM branches       WHERE id = 1;`);
    await queryRunner.query(`DELETE FROM tenants        WHERE id = 1;`);
  }
}
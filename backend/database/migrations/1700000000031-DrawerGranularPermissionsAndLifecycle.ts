import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 031 — Granular cash-drawer permissions + force-close persistence + drawer lifecycle fields
 *
 * Goals (Operational Control upgrade):
 * 1. Split drawer.manage into: drawer.view (already exists), drawer.open, drawer.close,
 *    drawer.force_close, drawer.reconcile.
 * 2. Safely migrate existing drawer.manage grants so no one loses access on deploy.
 * 3. Persist force-close reason + actor on the cash_drawers table.
 * 4. Add supporting columns for daily lifecycle (notes, force-close metadata).
 *
 * Does NOT alter historical migrations. Safe to run on production data.
 */
export class DrawerGranularPermissionsAndLifecycle1700000000031 implements MigrationInterface {
  name = 'DrawerGranularPermissionsAndLifecycle1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. New permission codes ───────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('drawer.open',        'Open Cash Drawer',        'drawer', 'create', 'Open a cash drawer for a branch/business day', NULL),
        ('drawer.close',       'Close Cash Drawer',       'drawer', 'update', 'Close an open cash drawer with counted cash', NULL),
        ('drawer.force_close', 'Force-Close Cash Drawer', 'drawer', 'update', 'Force-close an overdue or locked drawer with reason', NULL),
        ('drawer.reconcile',   'Reconcile Cash Drawer',   'drawer', 'approve','Reconcile a closed drawer and accept differences', NULL),
        ('loan.correct_terms',     'Correct Loan Terms',     'loan', 'update', 'Correct principal, rate, term, start date on a loan', NULL),
        ('loan.reschedule',        'Reschedule Loan',        'loan', 'update', 'Reschedule repayment dates while preserving payments', NULL),
        ('loan.correct_balance',   'Correct Loan Balance',   'loan', 'update', 'Apply audited balance adjustment', NULL),
        ('loan.approve_correction','Approve Loan Correction','loan', 'approve','Approve a pending loan correction (dual control)', NULL),
        ('loan.view_correction_history','View Correction History','loan','read','View loan correction and reschedule history', NULL)
      ON CONFLICT (code) DO NOTHING;
    `);

    // ── 2. Grant new drawer permissions based on existing drawer.manage ───────
    // Anyone who currently has drawer.manage receives open + close + force_close + reconcile
    // (safe migration — no unexpected loss of access).
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT DISTINCT rp.role_id, p.code, rp.tenant_id
      FROM role_permissions rp
      CROSS JOIN (
        SELECT unnest(ARRAY[
          'drawer.open','drawer.close','drawer.force_close','drawer.reconcile'
        ]) AS code
      ) p
      WHERE rp.permission_code = 'drawer.manage'
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // Also ensure drawer.view is present for the same roles (idempotent)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT DISTINCT rp.role_id, 'drawer.view', rp.tenant_id
      FROM role_permissions rp
      WHERE rp.permission_code = 'drawer.manage'
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // Admin / superadmin / manager also get the new loan correction permissions
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN (
        SELECT unnest(ARRAY[
          'loan.correct_terms','loan.reschedule','loan.correct_balance',
          'loan.approve_correction','loan.view_correction_history'
        ]) AS code
      ) p
      WHERE lower(r.name) IN ('admin','superadmin','super_admin','manager','md')
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // ── 3. Cash drawer table enhancements for force-close + lifecycle ─────────
    await queryRunner.query(`
      ALTER TABLE cash_drawers
        ADD COLUMN IF NOT EXISTS force_close_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS force_closed_by_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS force_closed_at TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS notes TEXT NULL,
        ADD COLUMN IF NOT EXISTS is_override_open BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS override_open_reason TEXT NULL
    `);

    // Optional FK (best-effort; ignore if users table shape differs)
    try {
      await queryRunner.query(`
        ALTER TABLE cash_drawers
          ADD CONSTRAINT fk_cash_drawers_force_closed_by
          FOREIGN KEY (force_closed_by_id) REFERENCES users(id)
          ON DELETE SET NULL
      `);
    } catch {
      // constraint may already exist or users PK name differs — non-fatal
    }

    // ── 4. Tenant-level drawer settings defaults (via app_settings) ───────────
    // Keys are read by SettingsService; values are JSON strings where needed.
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, tenant_id, created_at, updated_at)
      SELECT v.key, v.value, t.id, NOW(), NOW()
      FROM tenants t
      CROSS JOIN (
        VALUES
          ('drawer.business_timezone', 'Africa/Kampala'),
          ('drawer.closing_time', '18:00'),
          ('drawer.reminder_lead_minutes', '30'),
          ('drawer.grace_period_minutes', '60'),
          ('drawer.allow_manager_override_open', 'true'),
          ('drawer.require_force_close_reason', 'true')
      ) AS v(key, value)
      WHERE NOT EXISTS (
        SELECT 1 FROM app_settings s
        WHERE s.key = v.key AND s.tenant_id = t.id
      )
    `);

    // Global fallbacks
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, tenant_id, created_at, updated_at)
      VALUES
        ('drawer.business_timezone', 'Africa/Kampala', NULL, NOW(), NOW()),
        ('drawer.closing_time', '18:00', NULL, NOW(), NOW()),
        ('drawer.reminder_lead_minutes', '30', NULL, NOW(), NOW()),
        ('drawer.grace_period_minutes', '60', NULL, NOW(), NOW()),
        ('drawer.allow_manager_override_open', 'true', NULL, NOW(), NOW()),
        ('drawer.require_force_close_reason', 'true', NULL, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove only the new permission grants (leave the codes for safety)
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_code IN (
        'drawer.open','drawer.close','drawer.force_close','drawer.reconcile',
        'loan.correct_terms','loan.reschedule','loan.correct_balance',
        'loan.approve_correction','loan.view_correction_history'
      )
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (
        'drawer.open','drawer.close','drawer.force_close','drawer.reconcile',
        'loan.correct_terms','loan.reschedule','loan.correct_balance',
        'loan.approve_correction','loan.view_correction_history'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE cash_drawers
        DROP COLUMN IF EXISTS force_close_reason,
        DROP COLUMN IF EXISTS force_closed_by_id,
        DROP COLUMN IF EXISTS force_closed_at,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS is_override_open,
        DROP COLUMN IF EXISTS override_open_reason
    `);

    // Leave app_settings rows (non-destructive)
  }
}

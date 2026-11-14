import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 033 — Permission corrections found in the frontend-coverage audit.
 *
 * REVIEW BEFORE RUNNING on production.
 *
 * 1. Seeds `finance.reconcile` (used by ReconciliationController but only ever
 *    present in a loose SQL file, never in a migration) and grants it to
 *    admin/superadmin/manager and to every role holding `drawer.reconcile`.
 * 2. Seeds `drawer.settings` is NOT added: drawer settings use the existing
 *    settings endpoints (admin only).
 * 3. Revokes `drawer.force_close` and `drawer.reconcile` from the cashier role.
 *    Migration 031 granted them to cashiers only because cashiers held the legacy
 *    `drawer.manage`. Cashiers keep drawer.view / open / close.
 * 4. Safety net for the PermissionGuard now applied on LoansController: ensures
 *    admin/manager roles hold every loan.* permission the controller enforces,
 *    so enabling the guard cannot lock them out.
 */
export class DrawerPermissionCorrectionsAndReconcileSeed1700000000033 implements MigrationInterface {
  name = 'DrawerPermissionCorrectionsAndReconcileSeed1700000000033';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES ('finance.reconcile','Reconcile Cash','reconciliation','create','Create cash reconciliations', NULL)
      ON CONFLICT (code) DO NOTHING;
    `);

    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, 'finance.reconcile', r.tenant_id
      FROM roles r
      WHERE lower(r.name) IN ('admin','superadmin','super_admin','manager','md')
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT DISTINCT rp.role_id, 'finance.reconcile', rp.tenant_id
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      WHERE rp.permission_code = 'drawer.reconcile' AND lower(r.name) <> 'cashier'
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    await q.query(`
      DELETE FROM role_permissions
      WHERE permission_code IN ('drawer.force_close','drawer.reconcile')
        AND role_id IN (SELECT id FROM roles WHERE lower(name) = 'cashier');
    `);

    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN (SELECT unnest(ARRAY[
        'loan.approve','loan.reschedule','loan.correct_terms','loan.correct_balance',
        'loan.approve_correction','loan.view_correction_history'
      ]) AS code) p
      WHERE lower(r.name) IN ('admin','superadmin','super_admin','manager','md')
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    // Re-granting cashier drawer.force_close/reconcile is deliberately NOT automated.
    await q.query(`DELETE FROM role_permissions WHERE permission_code = 'finance.reconcile'`);
    await q.query(`DELETE FROM permissions WHERE code = 'finance.reconcile'`);
  }
}

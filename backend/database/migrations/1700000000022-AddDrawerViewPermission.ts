import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 022 — Add missing 'drawer.view' permission
 *
 * Migration 019 seeded 'drawer.manage' but several cash-drawer endpoints
 * (GET /current, GET /, GET /:id, GET /summaries) were written against
 * '@RequirePermission('drawer.view')' — a code that was never actually
 * seeded. Since admin/superadmin bypass permission checks entirely
 * (see hasPermission() in role-helper.ts), this went unnoticed for those
 * roles, but manager and cashier accounts have been silently denied
 * access to every drawer-viewing endpoint since 019 first ran.
 *
 * This adds 'drawer.view' as its own permission (view is a narrower scope
 * than manage — a cashier should be able to see their own drawer without
 * necessarily having full open/close/reconcile rights) and grants it to
 * every role that currently holds 'drawer.manage', plus admin/superadmin
 * for consistency.
 */
export class AddDrawerViewPermission1700000000022 implements MigrationInterface {
  name = 'AddDrawerViewPermission1700000000022';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed the new permission code (global, tenant_id = NULL)
    await queryRunner.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('drawer.view', 'View Cash Drawer', 'drawer', 'read', 'View drawer balances and transaction summaries', NULL)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 2. Grant it to every role that already has drawer.manage
    //    (admin, superadmin, manager, cashier — matches migration 019's matrix)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT DISTINCT rp.role_id, 'drawer.view', rp.tenant_id
      FROM role_permissions rp
      WHERE rp.permission_code = 'drawer.manage'
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_code = 'drawer.view';
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE code = 'drawer.view';
    `);
  }
}

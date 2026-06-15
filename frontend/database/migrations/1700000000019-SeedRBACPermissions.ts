import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 019 — Seed RBAC permission matrix
 *
 * Creates the 14 canonical permission codes and assigns them
 * to the 5 roles that exist for every tenant.
 *
 * Permission → Role matrix:
 *
 * Permission          | admin | manager | cashier | loan_officer | agent
 * --------------------|-------|---------|---------|--------------|------
 * client.create       |   ✓   |    ✓    |         |      ✓       |  ✓
 * client.edit         |   ✓   |    ✓    |         |      ✓       |
 * client.view         |   ✓   |    ✓    |         |      ✓       |  ✓
 * loan.create         |   ✓   |    ✓    |         |      ✓       |  ✓
 * loan.view           |   ✓   |    ✓    |         |      ✓       |  ✓
 * loan.approve        |   ✓   |    ✓    |         |              |
 * payment.create      |   ✓   |    ✓    |    ✓    |              |
 * payment.view        |   ✓   |    ✓    |    ✓    |              |
 * payment.reverse     |   ✓   |         |         |              |
 * expense.create      |   ✓   |    ✓    |    ✓    |              |
 * expense.approve     |   ✓   |    ✓    |         |              |
 * drawer.manage       |   ✓   |    ✓    |    ✓    |              |
 * report.view         |   ✓   |    ✓    |         |              |
 * settings.manage     |   ✓   |         |         |              |
 * user.manage         |   ✓   |         |         |              |
 */
export class SeedRBACPermissions1700000000019 implements MigrationInterface {
  name = 'SeedRBACPermissions1700000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Seed global permissions (tenant_id = NULL = system-wide) ──────────
    await queryRunner.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('client.create',    'Create Client',       'client',   'create', 'Register new clients',             NULL),
        ('client.edit',      'Edit Client',         'client',   'update', 'Update client details',            NULL),
        ('client.view',      'View Clients',        'client',   'read',   'View client list and profiles',    NULL),
        ('loan.create',      'Create Loan',         'loan',     'create', 'Submit loan applications',         NULL),
        ('loan.view',        'View Loans',          'loan',     'read',   'View loan list and details',       NULL),
        ('loan.approve',     'Approve Loan',        'loan',     'approve','Approve or reject loan applications', NULL),
        ('payment.create',   'Record Payment',      'payment',  'create', 'Record repayments and collections',NULL),
        ('payment.view',     'View Payments',       'payment',  'read',   'View payment history',             NULL),
        ('payment.reverse',  'Reverse Payment',     'payment',  'reverse','Initiate payment reversals',       NULL),
        ('expense.create',   'Create Expense',      'expense',  'create', 'Submit expense claims',            NULL),
        ('expense.approve',  'Approve Expense',     'expense',  'approve','Approve or reject expenses',       NULL),
        ('drawer.manage',    'Manage Cash Drawer',  'drawer',   'update', 'Open, close, and reconcile drawers', NULL),
        ('report.view',      'View Reports',        'report',   'read',   'Access financial reports',         NULL),
        ('settings.manage',  'Manage Settings',     'settings', 'update', 'Change system configuration',      NULL),
        ('user.manage',      'Manage Users',        'user',     'create', 'Create and manage staff accounts',  NULL)
      ON CONFLICT (code) DO NOTHING;
    `);

    // ── 2. Grant permissions to every existing role by name ──────────────────
    // admin  — all permissions
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('admin', 'superadmin')
        AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view','loan.approve',
          'payment.create','payment.view','payment.reverse',
          'expense.create','expense.approve',
          'drawer.manage','report.view','settings.manage','user.manage'
        )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // manager — all except settings.manage and user.manage
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'manager'
        AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view','loan.approve',
          'payment.create','payment.view',
          'expense.create','expense.approve',
          'drawer.manage','report.view'
        )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // cashier — payments, expenses, drawers only
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'cashier'
        AND p.code IN (
          'client.view',
          'payment.create','payment.view',
          'expense.create',
          'drawer.manage'
        )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // loan_officer — clients and loans only (no approvals)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name IN ('loan_officer', 'credit_officer')
        AND p.code IN (
          'client.create','client.edit','client.view',
          'loan.create','loan.view',
          'payment.view'
        )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // agent — register clients and submit loan applications
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'agent'
        AND p.code IN (
          'client.create','client.view',
          'loan.create','loan.view'
        )
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);

    // user — read-only dashboard access
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'user'
        AND p.code IN ('client.view','loan.view','payment.view')
      ON CONFLICT (role_id, permission_code) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_permissions WHERE permission_code IN (
      'client.create','client.edit','client.view',
      'loan.create','loan.view','loan.approve',
      'payment.create','payment.view','payment.reverse',
      'expense.create','expense.approve',
      'drawer.manage','report.view','settings.manage','user.manage'
    )`);
    await queryRunner.query(`DELETE FROM permissions WHERE code IN (
      'client.create','client.edit','client.view',
      'loan.create','loan.view','loan.approve',
      'payment.create','payment.view','payment.reverse',
      'expense.create','expense.approve',
      'drawer.manage','report.view','settings.manage','user.manage'
    )`);
  }
}

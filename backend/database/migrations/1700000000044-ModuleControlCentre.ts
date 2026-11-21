import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 044 — Module Control Centre (HandzJ commercial entitlement)
 *
 * Adds:
 *  - module_registry          product module catalogue
 *  - module_dependencies      hard/soft dependency edges
 *  - product_module_policies  product-wide access + visibility defaults
 *  - tenant_module_entitlements per-tenant commercial + access + visibility
 *  - module_access_history    immutable audit of control actions
 *
 * Non-destructive. Does not alter financial tables or drop existing data.
 * Seeds independently controllable modules discovered from Bingo Vintage nav + APIs.
 */
export class ModuleControlCentre1700000000044 implements MigrationInterface {
  name = 'ModuleControlCentre1700000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_registry (
        id                    SERIAL PRIMARY KEY,
        module_key            VARCHAR(80) NOT NULL UNIQUE,
        name                  VARCHAR(160) NOT NULL,
        description           TEXT NULL,
        category              VARCHAR(60) NOT NULL DEFAULT 'business',
        parent_module_key     VARCHAR(80) NULL,
        commercial_class      VARCHAR(40) NOT NULL DEFAULT 'core',
        is_independently_controllable BOOLEAN NOT NULL DEFAULT true,
        default_access_state  VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
        default_visibility    VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
        backend_route_prefixes TEXT[] NULL,
        frontend_route_prefixes TEXT[] NULL,
        permission_codes      TEXT[] NULL,
        sort_order            INTEGER NOT NULL DEFAULT 100,
        is_active             BOOLEAN NOT NULL DEFAULT true,
        metadata              JSONB NULL,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_dependencies (
        id                SERIAL PRIMARY KEY,
        module_key        VARCHAR(80) NOT NULL REFERENCES module_registry(module_key) ON DELETE CASCADE,
        depends_on_key    VARCHAR(80) NOT NULL REFERENCES module_registry(module_key) ON DELETE CASCADE,
        dependency_type   VARCHAR(20) NOT NULL DEFAULT 'soft',
        notes             TEXT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (module_key, depends_on_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_module_policies (
        id                SERIAL PRIMARY KEY,
        product_code      VARCHAR(60) NOT NULL DEFAULT 'bingo_vintage',
        module_key        VARCHAR(80) NOT NULL REFERENCES module_registry(module_key) ON DELETE CASCADE,
        access_state      VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
        visibility_state  VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
        reason            TEXT NULL,
        updated_by_id     INTEGER NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (product_code, module_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_module_entitlements (
        id                  SERIAL PRIMARY KEY,
        tenant_id           INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        module_key          VARCHAR(80) NOT NULL REFERENCES module_registry(module_key) ON DELETE CASCADE,
        access_state        VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
        visibility_state    VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
        commercial_status   VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        commercial_ref      VARCHAR(160) NULL,
        trial_ends_at       TIMESTAMPTZ NULL,
        expires_at          TIMESTAMPTZ NULL,
        reason              TEXT NULL,
        updated_by_id       INTEGER NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, module_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_tenant
        ON tenant_module_entitlements (tenant_id, module_key)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_access_history (
        id                      SERIAL PRIMARY KEY,
        product_code            VARCHAR(60) NOT NULL DEFAULT 'bingo_vintage',
        tenant_id               INTEGER NULL,
        module_key              VARCHAR(80) NOT NULL,
        scope                   VARCHAR(20) NOT NULL,
        previous_access_state   VARCHAR(20) NULL,
        new_access_state        VARCHAR(20) NULL,
        previous_visibility     VARCHAR(20) NULL,
        new_visibility          VARCHAR(20) NULL,
        previous_commercial     VARCHAR(30) NULL,
        new_commercial          VARCHAR(30) NULL,
        actor_user_id           INTEGER NULL,
        reason                  TEXT NULL,
        commercial_ref          VARCHAR(160) NULL,
        result                  VARCHAR(20) NOT NULL DEFAULT 'success',
        detail                  JSONB NULL,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_module_access_history_module
        ON module_access_history (module_key, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_module_access_history_tenant
        ON module_access_history (tenant_id, created_at DESC)
    `);

    // Seed independently controllable modules (discovered from nav + backend modules)
    await queryRunner.query(`
      INSERT INTO module_registry
        (module_key, name, description, category, commercial_class,
         is_independently_controllable, default_access_state, default_visibility,
         backend_route_prefixes, frontend_route_prefixes, permission_codes, sort_order)
      VALUES
        ('dashboard', 'Dashboard', 'Overview KPIs and work queue badges', 'core', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/dashboard'], ARRAY['/dashboard'], ARRAY['view_dashboard'], 10),
        ('clients', 'Clients', 'Client CRM and profiles', 'lending', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/clients'], ARRAY['/dashboard/clients'], ARRAY['client.view','view_clients'], 20),
        ('loans', 'Loans', 'Loan origination, approval, schedules and corrections', 'lending', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/loans'], ARRAY['/dashboard/loans'], ARRAY['loan.view','view_loans'], 30),
        ('payments', 'Payments', 'Collections, receipts and reversals', 'lending', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/payments'], ARRAY['/dashboard/payments'], ARRAY['payment.view','view_payments'], 40),
        ('cash_drawers', 'Cash Drawers', 'Drawer open/close, cash movements and history', 'cash', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/cash-drawers','/drawers'], ARRAY['/dashboard/my-drawer','/dashboard/finance/drawers'], ARRAY['drawer.manage','drawer.view'], 50),
        ('expenses', 'Expenses', 'Expense capture and dual-control approval', 'operations', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/expenses'], ARRAY['/dashboard/expenses'], ARRAY['expense.create','expense.approve'], 60),
        ('inventory', 'Inventory / Bikes', 'Motorcycle inventory and assignment', 'operations', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/bikes'], ARRAY['/dashboard/inventory'], ARRAY['view_inventory'], 70),
        ('reports', 'Reports', 'Operational and financial reporting exports', 'reporting', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/reports'], ARRAY['/dashboard/reports'], ARRAY['report.view'], 80),
        // Continuity: these modules are already deployed in bingo_vintage6 nav/API.
        // Seed ENABLED+VISIBLE so existing tenants keep current behaviour.
        // Provider may later set DISABLED/HIDDEN per tenant or product-wide.
        // NEW paid modules added after go-live must insert as DISABLED+HIDDEN.
        ('financial_operations', 'Financial Operations', 'Receive money, deposits, fin-ops approval queue', 'finance', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/financial-operations'], ARRAY['/dashboard/financial-ops'], ARRAY['financial_operations.view','financial_operations.approve'], 90),
        ('reservations', 'Reservations', 'Bike reservation and handover to loan', 'operations', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/reservations'], ARRAY['/dashboard/reservations'], ARRAY['reservations.view'], 100),
        ('recovery', 'Recovery', 'Motorcycle recovery and settlement cases', 'operations', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/recovery'], ARRAY['/dashboard/recovery'], ARRAY['motorcycle_recovery.view'], 110),
        ('notifications', 'Notifications', 'In-app notification centre', 'communications', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/notifications'], ARRAY['/dashboard/notifications'], ARRAY['notification.view'], 120),
        ('reconciliation', 'Reconciliation', 'Branch cash reconciliation', 'cash', 'add_on',
          true, 'ENABLED', 'VISIBLE',
          ARRAY['/reconciliation'], ARRAY['/dashboard/finance/reconciliation'], ARRAY['view_finance'], 130),
        ('settings', 'Settings', 'Tenant settings and role permission overrides', 'admin', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/settings'], ARRAY['/dashboard/settings'], ARRAY['settings.manage'], 140),
        ('audit', 'Audit', 'Audit log viewer', 'admin', 'core',
          false, 'ENABLED', 'VISIBLE',
          ARRAY['/audit'], ARRAY['/dashboard/audit'], ARRAY['view_audit'], 150)
      ON CONFLICT (module_key) DO NOTHING
    `);

    // Soft dependencies (documentation / safety checks — not auto-cascade disable)
    await queryRunner.query(`
      INSERT INTO module_dependencies (module_key, depends_on_key, dependency_type, notes)
      VALUES
        ('payments', 'loans', 'hard', 'Payments require loan records'),
        ('payments', 'cash_drawers', 'soft', 'Cash payments typically post to a drawer'),
        ('expenses', 'cash_drawers', 'soft', 'Cash expenses may debit an open drawer'),
        ('reservations', 'inventory', 'hard', 'Reservations bind to bikes'),
        ('reservations', 'loans', 'soft', 'Handover attaches financing'),
        ('recovery', 'loans', 'soft', 'Recovery cases usually reference loans'),
        ('recovery', 'inventory', 'soft', 'Physical asset recovery'),
        ('financial_operations', 'cash_drawers', 'soft', 'Receipts may move drawer balances'),
        ('reports', 'loans', 'soft', 'Most reports read loan/payment data'),
        ('reconciliation', 'cash_drawers', 'hard', 'Reconciliation closes drawer periods')
      ON CONFLICT (module_key, depends_on_key) DO NOTHING
    `);

    // Product-wide defaults mirror registry defaults
    await queryRunner.query(`
      INSERT INTO product_module_policies (product_code, module_key, access_state, visibility_state, reason)
      SELECT 'bingo_vintage', module_key, default_access_state, default_visibility, 'Seeded from module_registry defaults'
        FROM module_registry
      ON CONFLICT (product_code, module_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS module_access_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_module_entitlements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_module_policies CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_dependencies CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS module_registry CASCADE`);
  }
}

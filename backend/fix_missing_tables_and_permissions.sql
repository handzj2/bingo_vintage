-- ============================================================
-- BINGO VINTAGE — DB FIX SCRIPT
-- Run once against bingo_vintage PostgreSQL database.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================

BEGIN;

-- ── 1. Create missing tables (expenses, reconciliation) ─────

CREATE TABLE IF NOT EXISTS expense_categories (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id              SERIAL PRIMARY KEY,
  tenant_id       INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       INT REFERENCES branches(id) ON DELETE SET NULL,
  category_id     INT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount          DECIMAL(15,2) NOT NULL,
  description     TEXT NOT NULL,
  payment_method  VARCHAR(50) NOT NULL,
  cash_drawer_id  INT REFERENCES cash_drawers(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by_id   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by_id  INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_attachments (
  id          SERIAL PRIMARY KEY,
  expense_id  INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_url    VARCHAR NOT NULL,
  uploaded_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS office_reconciliations (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id    INT REFERENCES branches(id) ON DELETE SET NULL,
  drawer_id    INT NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  expected_cash DECIMAL(15,2) NOT NULL,
  actual_cash   DECIMAL(15,2) NOT NULL,
  difference    DECIMAL(15,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
  created_by_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reconciled_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at    TIMESTAMP DEFAULT now()
);

-- ── 2. Seed all permission codes ────────────────────────────

INSERT INTO permissions (code, name, resource, action, description) VALUES
  ('expense.create',    'Create Expense',       'expenses',       'create',  'Record a new expense'),
  ('expense.read',      'View Expenses',        'expenses',       'read',    'View expense list'),
  ('expense.update',    'Edit Expense',         'expenses',       'update',  'Edit a pending expense'),
  ('expense.approve',   'Approve Expense',      'expenses',       'approve', 'Approve or reject expenses'),
  ('expense.delete',    'Delete Expense',       'expenses',       'delete',  'Delete a pending expense'),
  ('finance.reconcile', 'Reconcile Cash',       'reconciliation', 'create',  'Create cash reconciliations'),
  ('finance.read',      'View Finance',         'reconciliation', 'read',    'View reconciliation history'),
  ('drawer.open',       'Open Cash Drawer',     'cash_drawers',   'create',  'Open a cash drawer'),
  ('drawer.close',      'Close Cash Drawer',    'cash_drawers',   'update',  'Close a cash drawer'),
  ('drawer.view',       'View Cash Drawers',    'cash_drawers',   'read',    'View drawer list'),
  ('view_dashboard',    'View Dashboard',       'dashboard',      'read',    'Access main dashboard'),
  ('view_loans',        'View Loans',           'loans',          'read',    'View loan list'),
  ('view_clients',      'View Clients',         'clients',        'read',    'View client list'),
  ('view_payments',     'View Payments',        'payments',       'read',    'View payment records'),
  ('view_schedules',    'View Schedules',       'loans',          'read',    'View repayment schedules'),
  ('view_inventory',    'View Inventory',       'bikes',          'read',    'View bike inventory'),
  ('view_reports',      'View Reports',         'reports',        'read',    'Access reporting pages'),
  ('view_audit',        'View Audit Logs',      'audit',          'read',    'Access audit trail'),
  ('view_reversals',    'View Reversals',       'payments',       'read',    'View and process reversals'),
  ('view_settings',     'View Settings',        'settings',       'read',    'Access system settings'),
  ('view_finance',      'View Finance',         'reconciliation', 'read',    'Access finance pages')
ON CONFLICT (code) DO NOTHING;

-- ── 3. Grant permissions to roles ───────────────────────────

WITH t AS (SELECT id FROM tenants ORDER BY id LIMIT 1)
INSERT INTO role_permissions (role_id, permission_code, tenant_id)
SELECT r.id, p.code, (SELECT id FROM t)
FROM roles r
CROSS JOIN permissions p
WHERE r.tenant_id = (SELECT id FROM t)
AND (
  (r.name = 'admin')
  OR (r.name = 'manager' AND p.code NOT IN ('view_audit','view_settings'))
  OR (r.name = 'cashier'  AND p.code IN (
       'view_dashboard','view_payments','view_schedules','view_inventory',
       'expense.create','expense.read','drawer.open','drawer.close','drawer.view'))
  OR (r.name = 'agent'    AND p.code IN (
       'view_dashboard','view_loans','view_clients','view_schedules','expense.read'))
)
ON CONFLICT (role_id, permission_code) DO NOTHING;

-- ── 4. Performance indexes ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id  ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_code     ON role_permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_code ON role_permissions(role_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_users_id_active           ON users(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_permissions_code          ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_status    ON expenses(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_drawer           ON expenses(cash_drawer_id) WHERE cash_drawer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loans_tenant_created      ON loans(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_loan             ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date      ON payments(tenant_id, payment_date DESC);

-- ── 5. Default expense categories for existing tenants ───────

INSERT INTO expense_categories (tenant_id, name, description)
SELECT t.id, cat.name, cat.description
FROM tenants t
CROSS JOIN (VALUES
  ('Transport',    'Vehicle fuel, transport costs'),
  ('Office',       'Office supplies and stationery'),
  ('Utilities',    'Electricity, water, internet'),
  ('Salaries',     'Staff wages and allowances'),
  ('Maintenance',  'Equipment and property repairs'),
  ('Marketing',    'Advertising and promotional costs'),
  ('Other',        'Miscellaneous expenses')
) AS cat(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories ec
  WHERE ec.tenant_id = t.id AND ec.name = cat.name
);

COMMIT;

-- ============================================================
-- VERIFY:
-- SELECT r.name, COUNT(rp.permission_code) perm_count
-- FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id
-- GROUP BY r.name ORDER BY r.name;
-- ============================================================
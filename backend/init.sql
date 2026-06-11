-- ============================================================
-- Bingo Vintage — Complete Database Schema (SaaS Edition)
-- Includes dynamic roles for UI‑based role assignment
-- ============================================================

-- ── ENUMS (keep only those still needed) ───────────────────
DO $$ BEGIN
  CREATE TYPE sync_status_enum  AS ENUM ('pending', 'synced', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bike_status_enum  AS ENUM ('AVAILABLE', 'LOANED', 'MAINTENANCE', 'SOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_status_enum  AS ENUM (
    'PENDING', 'PENDING_APPROVAL', 'ACTIVE', 'DELINQUENT',
    'COMPLETED', 'DEFAULTED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE schedule_status_enum AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM ('CASH', 'Momo', 'BANK_TRANSFER', 'Airtelmoney');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New enum for ledger transaction types (adjust values as needed)
DO $$ BEGIN
  CREATE TYPE ledger_transaction_type AS ENUM (
    'disbursement', 'repayment', 'fee', 'penalty', 'interest', 'reversal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── HELPER FUNCTION FOR UPDATED_AT TRIGGERS ────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TENANCY & BRANCH (foundation) ──────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  domain      VARCHAR(100) UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id             SERIAL PRIMARY KEY,
  tenant_id      INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  code           VARCHAR(20),
  address        TEXT,
  location       VARCHAR,
  manager_name   VARCHAR,
  contact_phone  VARCHAR,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- ── ROLES (dynamic, per tenant) ────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  description TEXT,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- ── PERMISSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(80) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  resource    VARCHAR(50) NOT NULL,
  action      VARCHAR(20) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reverse', 'export')),
  description TEXT,
  tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── ROLE PERMISSIONS (many-to-many) ────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id              SERIAL PRIMARY KEY,
  role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_code VARCHAR(80) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by      INTEGER,
  tenant_id       INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_code)
);

-- ── USERS (now with role_id) ───────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR NOT NULL UNIQUE,
  password_hash  VARCHAR NOT NULL,
  email          VARCHAR NOT NULL UNIQUE,
  full_name      VARCHAR,
  role_id        INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sync_status    VARCHAR NOT NULL DEFAULT 'pending',
  last_login     TIMESTAMP,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id      INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- ── CLIENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                        SERIAL PRIMARY KEY,
  first_name                VARCHAR NOT NULL,
  last_name                 VARCHAR NOT NULL,
  full_name                 VARCHAR,
  email                     VARCHAR UNIQUE,
  phone                     VARCHAR NOT NULL,
  alt_phone                 VARCHAR,
  address                   VARCHAR,
  city                      VARCHAR,
  state                     VARCHAR,
  country                   VARCHAR,
  postal_code               VARCHAR,
  id_number                 VARCHAR UNIQUE,
  nin                       VARCHAR UNIQUE,
  tax_id                    VARCHAR,
  date_of_birth             DATE,
  gender                    VARCHAR,
  marital_status            VARCHAR,
  nationality               VARCHAR,
  occupation                VARCHAR,
  employment_status         VARCHAR,
  monthly_income            DECIMAL(12,2) NOT NULL DEFAULT 0,
  bank_name                 VARCHAR,
  account_number            VARCHAR,
  bank_branch               VARCHAR,
  account_balance           DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_score              DECIMAL(5,2),
  loan_limit                DECIMAL(12,2),
  next_of_kin_name          VARCHAR,
  next_of_kin_phone         VARCHAR,
  next_of_kin_relationship  VARCHAR,
  business_name             VARCHAR,
  business_type             VARCHAR,
  business_address          VARCHAR,
  reference1_name           VARCHAR,
  reference1_phone          VARCHAR,
  reference2_name           VARCHAR,
  reference2_phone          VARCHAR,
  status                    VARCHAR DEFAULT 'active',
  verified                  BOOLEAN NOT NULL DEFAULT false,
  verification_method       VARCHAR,
  sync_status               VARCHAR NOT NULL DEFAULT 'pending',
  notes                     TEXT,
  tenant_id                 INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id                 INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now()
);

-- ── BIKES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bikes (
  id                   SERIAL PRIMARY KEY,
  model                VARCHAR NOT NULL,
  frame_number         VARCHAR NOT NULL UNIQUE,
  engine_number        VARCHAR UNIQUE,
  registration_number  VARCHAR UNIQUE,
  sale_price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  status               bike_status_enum NOT NULL DEFAULT 'AVAILABLE',
  assigned_client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  tenant_id            INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id            INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP NOT NULL DEFAULT now()
);

-- ── LOAN PRODUCTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_products (
  id                 SERIAL PRIMARY KEY,
  tenant_id          INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               VARCHAR(100) NOT NULL,
  loan_type          VARCHAR(20) NOT NULL,
  interest_model     VARCHAR(20) NOT NULL,
  min_amount         NUMERIC(12,2) NOT NULL,
  max_amount         NUMERIC(12,2) NOT NULL,
  min_term           INTEGER NOT NULL,
  max_term           INTEGER NOT NULL,
  term_unit          VARCHAR(10) NOT NULL,
  require_collateral BOOLEAN NOT NULL DEFAULT false,
  require_guarantors BOOLEAN NOT NULL DEFAULT false,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMP NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP NOT NULL DEFAULT now()
);

-- ── LOANS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id                SERIAL PRIMARY KEY,
  loan_number       VARCHAR NOT NULL UNIQUE,
  loan_type         VARCHAR NOT NULL DEFAULT 'cash',
  client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  bike_id           INTEGER REFERENCES bikes(id) ON DELETE SET NULL,
  principal_amount  DECIMAL(12,2) NOT NULL,
  interest_rate     DECIMAL(5,2) NOT NULL,
  total_amount      DECIMAL(12,2) NOT NULL,
  balance           DECIMAL(12,2) NOT NULL DEFAULT 0,
  term_months       INTEGER NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  status            loan_status_enum NOT NULL DEFAULT 'PENDING_APPROVAL',
  notes             TEXT,
  processing_fee    DECIMAL(12,2) NOT NULL DEFAULT 0,
  approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMP,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_by        INTEGER,
  deleted_at        TIMESTAMP,
  tenant_id         INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id         INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  product_id        INTEGER REFERENCES loan_products(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- ── LOAN SCHEDULES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_schedules (
  id                  SERIAL PRIMARY KEY,
  loan_id             INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_number  INTEGER NOT NULL,
  due_date            DATE NOT NULL,
  amount_due          DECIMAL(12,2) NOT NULL,
  principal_due       DECIMAL(12,2) NOT NULL,
  interest_due        DECIMAL(12,2) NOT NULL,
  amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0,
  status              schedule_status_enum NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ── PAYMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  loan_id           INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_id       INTEGER REFERENCES loan_schedules(id) ON DELETE SET NULL,
  amount            DECIMAL(12,2) NOT NULL,
  principal_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method    payment_method_enum NOT NULL DEFAULT 'CASH',
  receipt_number    VARCHAR NOT NULL UNIQUE,
  payment_date      TIMESTAMP NOT NULL DEFAULT now(),
  status            payment_status_enum NOT NULL DEFAULT 'COMPLETED',
  transaction_id    VARCHAR,
  idempotency_key   VARCHAR UNIQUE,
  collected_by      VARCHAR,
  notes             TEXT,
  reversed_at       TIMESTAMP,
  reversal_reason   VARCHAR,
  reversed_by       VARCHAR,
  policy_reference  VARCHAR DEFAULT '2026-01-10',
  tenant_id         INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id         INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- ── LEDGER ACCOUNTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(20) NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  type           VARCHAR(20) NOT NULL,
  normal_balance CHAR(1) NOT NULL,
  account_type   VARCHAR(20),
  tenant_id      INTEGER NOT NULL REFERENCES tenants(id)
);

-- ── LEDGER ENTRIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id               SERIAL PRIMARY KEY,
  loan_id          INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  transaction_type ledger_transaction_type NOT NULL,
  debit            NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit           NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_after    NUMERIC(12,2) NOT NULL DEFAULT 0,
  description      TEXT,
  reference        VARCHAR,
  transaction_ref  VARCHAR(50),
  account_code     VARCHAR(20),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  posted_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tenant_id        INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- ── PAYMENT ALLOCATIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_allocations (
  id                   SERIAL PRIMARY KEY,
  payment_id           INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  schedule_id          INTEGER NOT NULL REFERENCES loan_schedules(id) ON DELETE CASCADE,
  amount               NUMERIC(12,2) NOT NULL,
  loan_id              INTEGER REFERENCES loans(id) ON DELETE CASCADE,
  client_id            INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id            INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 1,
  branch_id            INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE DEFAULT 1,
  principal_allocated  NUMERIC(12,2) NOT NULL DEFAULT 0,
  interest_allocated   NUMERIC(12,2) NOT NULL DEFAULT 0,
  penalty_allocated    NUMERIC(12,2) NOT NULL DEFAULT 0,
  fees_allocated       NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  allocation_type      VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
  notes                TEXT,
  created_by           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total_allocated      NUMERIC(12,2) GENERATED ALWAYS AS (principal_allocated + interest_allocated + penalty_allocated + fees_allocated) STORED,
  created_at           TIMESTAMP DEFAULT now(),
  CONSTRAINT chk_allocation_type CHECK (allocation_type IN ('STANDARD', 'PARTIAL', 'EARLY_PAYOFF', 'REVERSAL', 'PENALTY'))
);

-- ── NOTIFICATION LOG ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id                 SERIAL PRIMARY KEY,
  tenant_id          INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  client_id          INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  loan_id            INTEGER REFERENCES loans(id) ON DELETE SET NULL,
  branch_id          INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  channel            VARCHAR(10) NOT NULL CHECK (channel IN ('SMS', 'EMAIL', 'PUSH')),
  notification_type  VARCHAR(50) NOT NULL,
  recipient          VARCHAR(200) NOT NULL,
  message            TEXT NOT NULL,
  status             VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  provider_ref       VARCHAR(100),
  error_message      TEXT,
  scheduled_for      TIMESTAMP WITH TIME ZONE,
  sent_at            TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── PORTFOLIO RISK SNAPSHOTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_risk_snapshots (
  id                 SERIAL PRIMARY KEY,
  tenant_id          INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id          INTEGER NOT NULL DEFAULT 1 REFERENCES branches(id) ON DELETE CASCADE,
  snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  total_loans        INTEGER NOT NULL DEFAULT 0,
  active_loans       INTEGER NOT NULL DEFAULT 0,
  portfolio_value    NUMERIC(14,2) NOT NULL DEFAULT 0,
  par30_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  par30_count        INTEGER NOT NULL DEFAULT 0,
  par30_rate         NUMERIC(6,4) NOT NULL DEFAULT 0,
  par60_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  par60_count        INTEGER NOT NULL DEFAULT 0,
  par60_rate         NUMERIC(6,4) NOT NULL DEFAULT 0,
  par90_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  par90_count        INTEGER NOT NULL DEFAULT 0,
  par90_rate         NUMERIC(6,4) NOT NULL DEFAULT 0,
  total_collected    NUMERIC(14,2) NOT NULL DEFAULT 0,
  recovery_rate      NUMERIC(6,4) NOT NULL DEFAULT 0,
  write_off_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  calculated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, snapshot_date)
);

-- ── LOAN ALERTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_alerts (
  id             SERIAL PRIMARY KEY,
  loan_id        INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_id    INTEGER REFERENCES loan_schedules(id) ON DELETE SET NULL,
  alert_type     VARCHAR NOT NULL,
  severity       VARCHAR NOT NULL DEFAULT 'medium',
  title          VARCHAR NOT NULL,
  message        TEXT,
  days_overdue   INTEGER NOT NULL DEFAULT 0,
  amount_due     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  is_resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at    TIMESTAMP,
  resolved_by    VARCHAR,
  tenant_id      INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id      INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- ── LOAN STATE TRANSITIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_state_transitions (
  id            SERIAL PRIMARY KEY,
  loan_id       INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  from_status   VARCHAR(30),
  to_status     VARCHAR(30) NOT NULL,
  transition    VARCHAR(50) NOT NULL,
  reason        TEXT,
  performed_by  INTEGER,
  metadata      JSONB,
  performed_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── PASSWORD RESET REQUESTS (legacy) ────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending',
  reason           TEXT,
  requested_at     TIMESTAMP NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMP,
  reviewed_by      INTEGER REFERENCES users(id),
  completed_at     TIMESTAMP,
  temp_password    VARCHAR,
  otp_attempts     INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  expired_at       TIMESTAMP WITH TIME ZONE,
  tenant_id        INTEGER REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── PASSWORD RESET REQUESTS V2 ──────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_requests_v2 (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  otp_hash               TEXT,
  otp_attempts           INTEGER NOT NULL DEFAULT 0,
  otp_expires_at         TIMESTAMP,
  reset_token            TEXT,
  reset_token_expires_at TIMESTAMP,
  approved_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at            TIMESTAMP,
  completed_at           TIMESTAMP,
  tenant_id              INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  created_at             TIMESTAMP NOT NULL DEFAULT now(),
  updated_at             TIMESTAMP NOT NULL DEFAULT now()
);

-- Trigger for updated_at on password_reset_requests_v2
DROP TRIGGER IF EXISTS trg_prr_v2_updated_at ON password_reset_requests_v2;
CREATE TRIGGER trg_prr_v2_updated_at
  BEFORE UPDATE ON password_reset_requests_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit (
  id           SERIAL PRIMARY KEY,
  action       VARCHAR NOT NULL,
  table_name   VARCHAR,
  record_id    INTEGER,
  old_values   TEXT,
  new_values   TEXT,
  "user"       VARCHAR,
  ip_address   VARCHAR,
  description  VARCHAR,
  metadata     TEXT,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- ── APP SETTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id           SERIAL PRIMARY KEY,
  key          VARCHAR NOT NULL UNIQUE,
  value        TEXT NOT NULL,
  description  VARCHAR,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- ── SAAS EXTENSION TABLES (custom fields, documents, etc.) ──

CREATE TABLE IF NOT EXISTS custom_fields (
    id               SERIAL PRIMARY KEY,
    tenant_id        INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type      VARCHAR(50) NOT NULL,
    field_name       VARCHAR(100) NOT NULL,
    field_label      VARCHAR(100) NOT NULL,
    field_type       VARCHAR(50) NOT NULL,
    is_required      BOOLEAN NOT NULL DEFAULT false,
    default_value    TEXT,
    validation_rules JSONB,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity_type, field_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id          SERIAL PRIMARY KEY,
    field_id    INTEGER NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_id   INTEGER NOT NULL,
    value       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_references (
    id            SERIAL PRIMARY KEY,
    tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    phone         VARCHAR(50),
    relationship  VARCHAR(100),
    address       TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guarantors (
    id            SERIAL PRIMARY KEY,
    tenant_id     INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    phone         VARCHAR(50) NOT NULL,
    nin           VARCHAR(50) UNIQUE,
    address       TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_guarantors (
    id            SERIAL PRIMARY KEY,
    loan_id       INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    guarantor_id  INTEGER NOT NULL REFERENCES guarantors(id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(loan_id, guarantor_id)
);

CREATE TABLE IF NOT EXISTS client_businesses (
    id               SERIAL PRIMARY KEY,
    tenant_id        INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    business_name    VARCHAR(200) NOT NULL,
    business_type    VARCHAR(100),
    address          TEXT,
    monthly_income   DECIMAL(12,2) DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id             SERIAL PRIMARY KEY,
    tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type    VARCHAR(50) NOT NULL,
    entity_id      INTEGER NOT NULL,
    document_type  VARCHAR(100) NOT NULL,
    file_url       TEXT NOT NULL,
    file_size      INTEGER,
    uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaterals (
    id               SERIAL PRIMARY KEY,
    tenant_id        INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type             VARCHAR(50) NOT NULL,
    description      TEXT,
    estimated_value  DECIMAL(12,2) NOT NULL,
    status           VARCHAR(20) DEFAULT 'active',
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_collaterals (
    id             SERIAL PRIMARY KEY,
    loan_id        INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    collateral_id  INTEGER NOT NULL REFERENCES collaterals(id) ON DELETE CASCADE,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(loan_id, collateral_id)
);

CREATE TABLE IF NOT EXISTS loan_restructures (
    id                 SERIAL PRIMARY KEY,
    loan_id            INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    old_term_months    INTEGER NOT NULL,
    new_term_months    INTEGER NOT NULL,
    old_installment    DECIMAL(12,2) NOT NULL,
    new_installment    DECIMAL(12,2) NOT NULL,
    reason             TEXT,
    approved_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_drawers (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    opening_balance DECIMAL(12,2) NOT NULL,
    closing_balance DECIMAL(12,2),
    drawer_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(20) DEFAULT 'open',
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id               SERIAL PRIMARY KEY,
    drawer_id        INTEGER NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    reference        VARCHAR(100),
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_jobs (
    id               SERIAL PRIMARY KEY,
    job_name         VARCHAR(100) NOT NULL,
    status           VARCHAR(20) NOT NULL,
    records_processed INTEGER DEFAULT 0,
    started_at       TIMESTAMP,
    finished_at      TIMESTAMP,
    error_message    TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_request_logs (
    id             BIGSERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    endpoint       VARCHAR(255) NOT NULL,
    method         VARCHAR(10) NOT NULL,
    ip_address     VARCHAR(45),
    response_time  INTEGER,
    status_code    INTEGER,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address     VARCHAR(45),
    device_info    TEXT,
    login_time     TIMESTAMP NOT NULL DEFAULT now(),
    logout_time    TIMESTAMP,
    status         VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS notifications (
    id             BIGSERIAL PRIMARY KEY,
    tenant_id      INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
    client_id      INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    channel        VARCHAR(20) NOT NULL,
    message        TEXT NOT NULL,
    status         VARCHAR(20) DEFAULT 'pending',
    sent_at        TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    max_users      INTEGER,
    max_branches   INTEGER,
    max_loans      INTEGER,
    price_monthly  DECIMAL(10,2) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id             SERIAL PRIMARY KEY,
    tenant_id      INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id        INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    start_date     DATE NOT NULL,
    end_date       DATE,
    status         VARCHAR(20) DEFAULT 'active',
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_snapshots (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    total_loans         INTEGER NOT NULL DEFAULT 0,
    total_outstanding   DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_arrears       DECIMAL(14,2) NOT NULL DEFAULT 0,
    portfolio_at_risk   DECIMAL(5,2),
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id             BIGSERIAL PRIMARY KEY,
    metric_name    VARCHAR(100) NOT NULL,
    metric_value   DECIMAL(12,2) NOT NULL,
    recorded_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- ── INDEXES (performance) ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_phone       ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_nin         ON clients(nin);
CREATE INDEX IF NOT EXISTS idx_loans_client_id     ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status        ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_type     ON loans(loan_type);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id    ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_loan_id   ON loan_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date  ON loan_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at    ON audit(created_at);
CREATE INDEX IF NOT EXISTS idx_loan_schedules_status_due ON loan_schedules(status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_cfv_field_entity ON custom_field_values(field_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_client ON payment_allocations(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_loan_id ON payment_allocations(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_schedule ON payment_allocations(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_tenant ON payment_allocations(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_notif_client ON notification_log(client_id);
CREATE INDEX IF NOT EXISTS idx_notif_loan ON notification_log(loan_id);
CREATE INDEX IF NOT EXISTS idx_notif_scheduled ON notification_log(scheduled_for) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notif_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risk_snapshot_tenant ON portfolio_risk_snapshots(tenant_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON loan_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_loan_id ON loan_alerts(loan_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON loan_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON loan_alerts(is_read) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_loan_transitions_at ON loan_state_transitions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_transitions_loan ON loan_state_transitions(loan_id);
CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_prr_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prr_user_status ON password_reset_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_prr_v2_created_at ON password_reset_requests_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prr_v2_reset_token ON password_reset_requests_v2(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prr_v2_status ON password_reset_requests_v2(status);
CREATE INDEX IF NOT EXISTS idx_prr_v2_user_id ON password_reset_requests_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_prr_v2_user_status ON password_reset_requests_v2(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_status ON password_reset_requests_v2(user_id, status) WHERE status IN ('PENDING', 'APPROVED');
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant_date ON financial_snapshots(tenant_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON system_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ledger_client ON ledger_entries(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_loan ON ledger_entries(loan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_loan_id ON ledger_entries(loan_id);
CREATE INDEX IF NOT EXISTS idx_ledger_tenant ON ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(transaction_type, created_at DESC);

-- ── COMMENTS FOR PARTITIONING ──────────────────────────────
COMMENT ON TABLE payments IS 'Consider partitioning by created_at (monthly) for large volumes.';
COMMENT ON TABLE audit IS 'Consider partitioning by created_at (monthly).';
COMMENT ON TABLE ledger_entries IS 'Consider partitioning by created_at (monthly).';
COMMENT ON TABLE notifications IS 'Consider partitioning by created_at (monthly).';

-- ============================================================
-- SEED DATA (default tenant, roles, admin user, etc.)
-- ============================================================

-- Insert a default tenant (if none exists)
INSERT INTO tenants (name, domain)
SELECT 'Default Tenant', 'default.local'
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- Insert default roles for the default tenant
WITH default_tenant AS (SELECT id FROM tenants LIMIT 1)
INSERT INTO roles (tenant_id, name, description, is_default)
SELECT
    default_tenant.id,
    r.role_name,
    CASE r.role_name
        WHEN 'admin'   THEN 'System Administrator with full access'
        WHEN 'manager' THEN 'Branch Manager'
        WHEN 'cashier' THEN 'Cashier'
        WHEN 'agent'   THEN 'Field Agent'
        WHEN 'user'    THEN 'Basic User'
    END,
    CASE r.role_name WHEN 'user' THEN true ELSE false END
FROM default_tenant
CROSS JOIN (VALUES ('admin'), ('manager'), ('cashier'), ('agent'), ('user')) AS r(role_name)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Insert default admin user (if not exists)
-- Password: Admin@2026 (hashed with bcrypt)
INSERT INTO users (username, password_hash, email, full_name, role_id, is_active, sync_status, tenant_id)
SELECT
    'admin',
    '$2b$10$q.4hqjRDgH.2PxqlBViW1OPUXIqD.fdNWXZgSfOk2Nj2kkZFOp6lu',
    'admin@bingovintage.com',
    'System Administrator',
    (SELECT id FROM roles WHERE name = 'admin' AND tenant_id = (SELECT id FROM tenants LIMIT 1)),
    true,
    'synced',
    (SELECT id FROM tenants LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Insert default app settings
INSERT INTO app_settings (key, value, description, tenant_id)
SELECT key, value, description, (SELECT id FROM tenants LIMIT 1)
FROM (VALUES
    ('interest_rate_cash',   '15',            'Monthly interest rate for cash loans (%)'),
    ('interest_rate_bike',   '10',            'Weekly interest rate for bike loans (%)'),
    ('max_loan_term_months', '24',            'Maximum loan term in months'),
    ('processing_fee_rate',  '2',             'Processing fee as % of principal'),
    ('late_fee_rate',        '5',             'Late payment penalty (%)'),
    ('currency',             'UGX',           'System currency'),
    ('company_name',         'Bingo Vintage', 'Company name for receipts and reports')
) AS s(key, value, description)
ON CONFLICT (key) DO NOTHING;

-- Insert sample bikes
INSERT INTO bikes (model, frame_number, engine_number, registration_number, sale_price, purchase_price, status, tenant_id)
SELECT model, frame_number, engine_number, registration_number, sale_price, purchase_price, status, (SELECT id FROM tenants LIMIT 1)
FROM (VALUES
    ('Bajaj Boxer 150',  'BX150-001-2026', 'ENG-BX-001', 'UAA 001A', 3500000, 2800000, 'AVAILABLE'),
    ('Honda CG 125',     'HC125-002-2026', 'ENG-HC-002', 'UAB 002B', 2800000, 2200000, 'AVAILABLE'),
    ('TVS Apache 160',   'TVS160-003-2026','ENG-TVS-003', 'UAC 003C', 4200000, 3400000, 'AVAILABLE'),
    ('Bajaj Boxer 100',  'BX100-004-2026', 'ENG-BX-004', NULL,       2500000, 1900000, 'AVAILABLE'),
    ('Yamaha YBR 125',   'YBR125-005-2026','ENG-YBR-005', 'UAE 005E', 3200000, 2600000, 'AVAILABLE')
) AS s(model, frame_number, engine_number, registration_number, sale_price, purchase_price, status)
ON CONFLICT (frame_number) DO NOTHING;

-- Insert a sample client
INSERT INTO clients (
  first_name, last_name, full_name, phone, email,
  address, city, country, occupation, employment_status,
  monthly_income, status, verified, sync_status, tenant_id
)
SELECT
  'John', 'Doe', 'John Doe', '0701234567', 'john.doe@test.com',
  'Kampala Road', 'Kampala', 'Uganda', 'Boda Boda Rider', 'Self Employed',
  800000, 'active', true, 'synced', (SELECT id FROM tenants LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'john.doe@test.com');
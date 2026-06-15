import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1700000000001-FoundationSchema
 *
 * Creates the complete baseline schema required by all other migrations.
 * Tables are created in dependency order so foreign keys always reference
 * an already-existing table.
 *
 * Order:
 *   enums → tenants → branches → roles → permissions → role_permissions
 *   → users → clients → bikes → loan_products → loans → loan_schedules
 *   → payments → cash_drawers → app_settings → audit → password_resets
 *   → loan_alerts → ledger_accounts → ledger_entries
 *
 * This replaces init.sql as the authoritative schema bootstrap.
 * Once this migration has run, init.sql should NOT be executed manually.
 */
export class FoundationSchema1700000000001 implements MigrationInterface {
  name = 'FoundationSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── ENUMS ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE sync_status_enum AS ENUM ('pending', 'synced', 'failed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE bike_status_enum AS ENUM ('AVAILABLE', 'LOANED', 'MAINTENANCE', 'SOLD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE loan_status_enum AS ENUM (
          'PENDING', 'PENDING_APPROVAL', 'ACTIVE', 'DELINQUENT',
          'COMPLETED', 'DEFAULTED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE schedule_status_enum AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'WAIVED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method_enum AS ENUM ('CASH', 'Momo', 'BANK_TRANSFER', 'Airtelmoney');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ledger_transaction_type AS ENUM (
          'disbursement', 'repayment', 'fee', 'penalty', 'interest', 'reversal'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── UPDATED_AT TRIGGER FUNCTION ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ── TENANTS ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(100) NOT NULL UNIQUE,
        slug          VARCHAR(100) UNIQUE,
        domain        VARCHAR(100) UNIQUE,
        description   TEXT,
        settings      JSONB NOT NULL DEFAULT '{}',
        is_active     BOOLEAN NOT NULL DEFAULT true,
        contact_email VARCHAR,
        contact_phone VARCHAR,
        address       TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT now(),
        updated_at    TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── BRANCHES ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id            SERIAL PRIMARY KEY,
        tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name          VARCHAR(100) NOT NULL,
        code          VARCHAR(20),
        address       TEXT,
        location      VARCHAR,
        manager_name  VARCHAR,
        contact_phone VARCHAR,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMP NOT NULL DEFAULT now(),
        updated_at    TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── ROLES ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id          SERIAL PRIMARY KEY,
        tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        VARCHAR(50) NOT NULL,
        description TEXT,
        is_default  BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMP NOT NULL DEFAULT now(),
        updated_at  TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(tenant_id, name)
      );
    `);

    // ── PERMISSIONS ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id          SERIAL PRIMARY KEY,
        code        VARCHAR(80) NOT NULL UNIQUE,
        name        VARCHAR(100) NOT NULL,
        resource    VARCHAR(50) NOT NULL,
        action      VARCHAR(20) NOT NULL
                      CHECK (action IN ('create','read','update','delete','approve','reverse','export')),
        description TEXT,
        tenant_id   INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    // ── ROLE_PERMISSIONS ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id              SERIAL PRIMARY KEY,
        role_id         INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_code VARCHAR(80) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
        granted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        granted_by      INTEGER,
        tenant_id       INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_code)
      );
    `);

    // ── USERS ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                      SERIAL PRIMARY KEY,
        username                VARCHAR NOT NULL UNIQUE,
        password_hash           VARCHAR NOT NULL,
        email                   VARCHAR NOT NULL UNIQUE,
        full_name               VARCHAR,
        role_id                 INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        sync_status             VARCHAR NOT NULL DEFAULT 'pending',
        last_login              TIMESTAMP,
        permissions             JSONB DEFAULT '{}',
        must_change_password    BOOLEAN NOT NULL DEFAULT false,
        temp_password_hash      VARCHAR,
        temp_password_expires_at TIMESTAMP,
        tenant_id               INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        branch_id               INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at              TIMESTAMP NOT NULL DEFAULT now(),
        updated_at              TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── CLIENTS ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id                       SERIAL PRIMARY KEY,
        first_name               VARCHAR NOT NULL,
        last_name                VARCHAR NOT NULL,
        full_name                VARCHAR,
        email                    VARCHAR UNIQUE,
        phone                    VARCHAR NOT NULL,
        alt_phone                VARCHAR,
        address                  VARCHAR,
        city                     VARCHAR,
        state                    VARCHAR,
        country                  VARCHAR,
        postal_code              VARCHAR,
        id_number                VARCHAR UNIQUE,
        nin                      VARCHAR UNIQUE,
        tax_id                   VARCHAR,
        date_of_birth            DATE,
        gender                   VARCHAR,
        marital_status           VARCHAR,
        nationality              VARCHAR,
        occupation               VARCHAR,
        employment_status        VARCHAR,
        monthly_income           DECIMAL(12,2) NOT NULL DEFAULT 0,
        bank_name                VARCHAR,
        account_number           VARCHAR,
        bank_branch              VARCHAR,
        account_balance          DECIMAL(12,2) NOT NULL DEFAULT 0,
        credit_score             DECIMAL(5,2),
        loan_limit               DECIMAL(12,2),
        next_of_kin_name         VARCHAR,
        next_of_kin_phone        VARCHAR,
        next_of_kin_relationship VARCHAR,
        business_name            VARCHAR,
        business_type            VARCHAR,
        business_address         VARCHAR,
        reference1_name          VARCHAR,
        reference1_phone         VARCHAR,
        reference2_name          VARCHAR,
        reference2_phone         VARCHAR,
        status                   VARCHAR DEFAULT 'active',
        verified                 BOOLEAN NOT NULL DEFAULT false,
        verification_method      VARCHAR,
        sync_status              VARCHAR NOT NULL DEFAULT 'pending',
        notes                    TEXT,
        tenant_id                INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        branch_id                INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at               TIMESTAMP NOT NULL DEFAULT now(),
        updated_at               TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── BIKES ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bikes (
        id                  SERIAL PRIMARY KEY,
        model               VARCHAR NOT NULL,
        frame_number        VARCHAR NOT NULL UNIQUE,
        engine_number       VARCHAR UNIQUE,
        registration_number VARCHAR UNIQUE,
        sale_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
        purchase_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
        status              bike_status_enum NOT NULL DEFAULT 'AVAILABLE',
        assigned_client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        tenant_id           INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        branch_id           INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at          TIMESTAMP NOT NULL DEFAULT now(),
        updated_at          TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── LOAN_PRODUCTS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loan_products (
        id                 SERIAL PRIMARY KEY,
        tenant_id          INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name               VARCHAR(100) NOT NULL,
        loan_type          VARCHAR(20) NOT NULL,
        interest_model     VARCHAR(20) NOT NULL,
        interest_rate      DECIMAL(5,2) NOT NULL,
        min_amount         DECIMAL(12,2),
        max_amount         DECIMAL(12,2),
        min_term_months    INTEGER,
        max_term_months    INTEGER,
        processing_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
        is_active          BOOLEAN NOT NULL DEFAULT true,
        created_at         TIMESTAMP NOT NULL DEFAULT now(),
        updated_at         TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── LOANS ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id               SERIAL PRIMARY KEY,
        loan_number      VARCHAR NOT NULL UNIQUE,
        loan_type        VARCHAR NOT NULL DEFAULT 'cash',
        client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
        bike_id          INTEGER REFERENCES bikes(id) ON DELETE SET NULL,
        principal_amount DECIMAL(12,2) NOT NULL,
        interest_rate    DECIMAL(5,2) NOT NULL,
        total_amount     DECIMAL(12,2) NOT NULL,
        balance          DECIMAL(12,2) NOT NULL DEFAULT 0,
        term_months      INTEGER NOT NULL,
        term_weeks       INTEGER,
        weekly_amount    DECIMAL(12,2),
        deposit          DECIMAL(12,2) DEFAULT 0,
        start_date       DATE NOT NULL,
        end_date         DATE,
        status           loan_status_enum NOT NULL DEFAULT 'PENDING_APPROVAL',
        notes            TEXT,
        processing_fee   DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_arrears    DECIMAL(14,2) NOT NULL DEFAULT 0,
        days_in_arrears  INTEGER NOT NULL DEFAULT 0,
        approved_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at      TIMESTAMP,
        created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        deleted_by       INTEGER,
        deleted_at       TIMESTAMP,
        tenant_id        INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        branch_id        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        product_id       INTEGER REFERENCES loan_products(id) ON DELETE SET NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── LOAN_SCHEDULES ────────────────────────────────────────────────────────
    await queryRunner.query(`
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
        paid_date           TIMESTAMP,
        receipt_number      VARCHAR,
        payment_method      VARCHAR,
        payment_notes       TEXT,
        overdue_days        INTEGER NOT NULL DEFAULT 0,
        late_fee_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
        penalty_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
        last_penalty_applied DATE,
        tenant_id           INTEGER DEFAULT 1,
        branch_id           INTEGER DEFAULT 1,
        created_at          TIMESTAMP NOT NULL DEFAULT now(),
        updated_at          TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── CASH_DRAWERS ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cash_drawers (
        id               SERIAL PRIMARY KEY,
        tenant_id        INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id        INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
        opening_balance  DECIMAL(15,2) NOT NULL DEFAULT 0,
        current_balance  DECIMAL(15,2) NOT NULL DEFAULT 0,
        closing_balance  DECIMAL(15,2),
        expected_balance DECIMAL(15,2),
        difference       DECIMAL(15,2),
        drawer_date      DATE NOT NULL DEFAULT CURRENT_DATE,
        status           VARCHAR(20) NOT NULL DEFAULT 'open',
        closed_at        TIMESTAMP,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id               SERIAL PRIMARY KEY,
        loan_id          INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        schedule_id      INTEGER REFERENCES loan_schedules(id) ON DELETE SET NULL,
        amount           DECIMAL(12,2) NOT NULL,
        principal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        interest_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method   VARCHAR NOT NULL DEFAULT 'CASH',
        receipt_number   VARCHAR UNIQUE,
        payment_date     TIMESTAMP NOT NULL DEFAULT now(),
        status           VARCHAR NOT NULL DEFAULT 'COMPLETED',
        transaction_id   VARCHAR,
        idempotency_key  VARCHAR UNIQUE,
        collected_by     VARCHAR,
        notes            TEXT,
        reversed_at      TIMESTAMP,
        reversal_reason  VARCHAR,
        reversed_by      VARCHAR,
        policy_reference VARCHAR DEFAULT '2026-01-10',
        created_by_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        cash_drawer_id   INTEGER REFERENCES cash_drawers(id) ON DELETE SET NULL,
        tenant_id        INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        branch_id        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT now(),
        updated_at       TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── APP_SETTINGS ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id         SERIAL PRIMARY KEY,
        key        VARCHAR(100) NOT NULL,
        value      TEXT,
        tenant_id  INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(key, tenant_id)
      );
    `);

    // ── AUDIT ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit (
        id         SERIAL PRIMARY KEY,
        action     VARCHAR NOT NULL,
        table_name VARCHAR,
        record_id  INTEGER,
        old_values TEXT,
        new_values TEXT,
        "user"     VARCHAR,
        ip_address VARCHAR,
        description VARCHAR,
        metadata   TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── LEDGER_ACCOUNTS ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ledger_accounts (
        id             SERIAL PRIMARY KEY,
        code           VARCHAR(20) NOT NULL UNIQUE,
        name           VARCHAR(100) NOT NULL,
        type           VARCHAR(20) NOT NULL,
        normal_balance CHAR(1) NOT NULL,
        account_type   VARCHAR(20),
        tenant_id      INTEGER NOT NULL REFERENCES tenants(id)
      );
    `);

    // ── LEDGER_ENTRIES ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id               SERIAL PRIMARY KEY,
        loan_id          INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        transaction_type ledger_transaction_type NOT NULL,
        debit            DECIMAL(12,2) NOT NULL DEFAULT 0,
        credit           DECIMAL(12,2) NOT NULL DEFAULT 0,
        balance          DECIMAL(12,2) NOT NULL DEFAULT 0,
        reference        VARCHAR,
        description      TEXT,
        tenant_id        INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_client   ON loans(client_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_status   ON loans(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_tenant   ON loans(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_branch   ON loans(branch_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_loan  ON payments(loan_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedules_loan ON loan_schedules(loan_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant   ON users(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit(created_at DESC);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_entries CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ledger_accounts CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_settings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cash_drawers CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS loan_schedules CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS loans CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS loan_products CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bikes CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS branches CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS ledger_transaction_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS schedule_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS loan_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS bike_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_status_enum;`);
  }
}

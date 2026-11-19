import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 — Financial Operations tables.
 * Loan repayments remain in PaymentsService. This module handles other money movements.
 * Additive only.
 */
export class FinancialOperations1700000000041 implements MigrationInterface {
  name = 'FinancialOperations1700000000041';

  public async up(q: QueryRunner): Promise<void> {
    // ── fin_categories ──────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS fin_categories (
        id          SERIAL PRIMARY KEY,
        tenant_id   INTEGER NOT NULL,
        code        VARCHAR(32) NOT NULL,
        name        VARCHAR(120) NOT NULL,
        kind        VARCHAR(30) NOT NULL,
        on_behalf   BOOLEAN NOT NULL DEFAULT false,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        description TEXT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_fin_categories_tenant_code UNIQUE (tenant_id, code)
      )
    `);

    // ── fin_transactions ────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS fin_transactions (
        id               SERIAL PRIMARY KEY,
        tenant_id        INTEGER NOT NULL,
        branch_id        INTEGER NULL,
        type             VARCHAR(30) NOT NULL,
        status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        amount           NUMERIC(15,2) NOT NULL,
        currency         VARCHAR(3) NOT NULL DEFAULT 'UGX',
        category_id      INTEGER NULL REFERENCES fin_categories(id),
        client_id        INTEGER NULL,
        loan_id          INTEGER NULL,
        reservation_id   INTEGER NULL,
        cash_drawer_id   INTEGER NULL,
        from_account_id  INTEGER NULL,
        to_account_id    INTEGER NULL,
        journal_id       INTEGER NULL,
        reference        VARCHAR(64) NOT NULL,
        idempotency_key  VARCHAR(128) NOT NULL,
        description      TEXT NULL,
        reason           TEXT NULL,
        created_by_id    INTEGER NULL,
        approved_by_id   INTEGER NULL,
        posted_by_id     INTEGER NULL,
        reversed_by_id   INTEGER NULL,
        reversal_of_id   INTEGER NULL,
        txn_date         DATE NOT NULL,
        approved_at      TIMESTAMPTZ NULL,
        posted_at        TIMESTAMPTZ NULL,
        reversed_at      TIMESTAMPTZ NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_fin_txn_tenant_idempotency UNIQUE (tenant_id, idempotency_key),
        CONSTRAINT chk_fin_txn_amount_positive CHECK (amount > 0)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_txn_tenant_status ON fin_transactions (tenant_id, status)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_txn_tenant_date ON fin_transactions (tenant_id, txn_date)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_txn_client ON fin_transactions (tenant_id, client_id)`);

    // ── client_deposits ─────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS client_deposits (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        branch_id       INTEGER NULL,
        client_id       INTEGER NOT NULL,
        reservation_id  INTEGER NULL,
        fin_txn_id      INTEGER NULL REFERENCES fin_transactions(id),
        amount_received NUMERIC(15,2) NOT NULL,
        amount_allocated NUMERIC(15,2) NOT NULL DEFAULT 0,
        amount_refunded NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(30) NOT NULL DEFAULT 'HELD',
        received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by_id   INTEGER NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_deposit_amounts CHECK (
          amount_received >= 0 AND amount_allocated >= 0 AND amount_refunded >= 0
          AND (amount_allocated + amount_refunded) <= amount_received
        )
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_client_deposits_client ON client_deposits (tenant_id, client_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_client_deposits_status ON client_deposits (tenant_id, status)`);

    // ── deposit_allocations ─────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS deposit_allocations (
        id            SERIAL PRIMARY KEY,
        tenant_id     INTEGER NOT NULL,
        deposit_id    INTEGER NOT NULL REFERENCES client_deposits(id),
        loan_id       INTEGER NULL,
        amount        NUMERIC(15,2) NOT NULL,
        allocation_type VARCHAR(30) NOT NULL DEFAULT 'DOWN_PAYMENT',
        fin_txn_id    INTEGER NULL,
        created_by_id INTEGER NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_alloc_amount_positive CHECK (amount > 0)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_deposit_alloc_deposit ON deposit_allocations (deposit_id)`);

    // ── field_collections ───────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS field_collections (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        branch_id       INTEGER NULL,
        officer_id      INTEGER NOT NULL,
        collection_date DATE NOT NULL,
        amount          NUMERIC(15,2) NOT NULL,
        status          VARCHAR(30) NOT NULL DEFAULT 'HELD',
        remittance_id   INTEGER NULL,
        fin_txn_id      INTEGER NULL,
        notes           TEXT NULL,
        created_by_id   INTEGER NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_field_coll_amount CHECK (amount > 0)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_field_coll_officer ON field_collections (tenant_id, officer_id, status)`);

    // ── remittance_batches ──────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS remittance_batches (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        branch_id       INTEGER NULL,
        officer_id      INTEGER NOT NULL,
        total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
        status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        cash_drawer_id  INTEGER NULL,
        fin_txn_id      INTEGER NULL,
        submitted_at    TIMESTAMPTZ NULL,
        completed_at    TIMESTAMPTZ NULL,
        created_by_id   INTEGER NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Partial unique: a collection can be in only one completed batch
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_field_coll_completed_remittance
        ON field_collections (id)
        WHERE status = 'REMITTED' AND remittance_id IS NOT NULL
    `);

    // Seed default categories per tenant
    await q.query(`
      INSERT INTO fin_categories (tenant_id, code, name, kind, on_behalf, description)
      SELECT t.id, v.code, v.name, v.kind, v.on_behalf, v.descr
        FROM tenants t
       CROSS JOIN (VALUES
         ('OTHER_INCOME',  'Other Income',     'INCOME',  false, 'Miscellaneous business income'),
         ('FINE_INCOME',   'Fines (Business)', 'INCOME',  false, 'Fines retained as business income'),
         ('FINE_ONBEHALF', 'Fines (On Behalf)','INCOME',  true,  'Fines collected for third parties'),
         ('REFUND',        'Client Refund',    'OUTGOING',false, 'Refund of client deposit or overpayment'),
         ('TRANSFER',      'Internal Transfer','TRANSFER',false, 'Cash/bank internal transfer'),
         ('FIELD_COLL',    'Field Collection', 'INCOME',  false, 'Cash collected in the field'),
         ('REMITTANCE',    'Remittance',       'TRANSFER',false, 'Officer remittance to drawer')
       ) AS v(code, name, kind, on_behalf, descr)
       ON CONFLICT (tenant_id, code) DO NOTHING
    `);

    // Permissions
    await q.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('financial_operations.view',     'View financial operations', 'financial_operations', 'view',   'View fin transactions and deposits', NULL),
        ('financial_operations.create',   'Create financial ops',      'financial_operations', 'create', 'Create money-in/out/transfers', NULL),
        ('financial_operations.approve',  'Approve financial ops',     'financial_operations', 'approve','Approve financial transactions', NULL),
        ('financial_operations.post',     'Post financial ops',        'financial_operations', 'post',   'Post financial transactions', NULL),
        ('financial_operations.reverse',  'Reverse financial ops',     'financial_operations', 'reverse','Reverse posted financial transactions', NULL)
      ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
        FROM roles r
        CROSS JOIN permissions p
       WHERE lower(r.name) IN ('admin', 'superadmin')
         AND p.code LIKE 'financial_operations.%'
         AND NOT EXISTS (
           SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_code = p.code
         )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS deposit_allocations`);
    await q.query(`DROP TABLE IF EXISTS client_deposits`);
    await q.query(`DROP TABLE IF EXISTS field_collections`);
    await q.query(`DROP TABLE IF EXISTS remittance_batches`);
    await q.query(`DROP TABLE IF EXISTS fin_transactions`);
    await q.query(`DROP TABLE IF EXISTS fin_categories`);
  }
}

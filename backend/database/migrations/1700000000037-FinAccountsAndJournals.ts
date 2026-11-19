import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 foundation — double-entry layer.
 * Additive only. Existing ledger_entries remain the loan-event authority.
 * Journals are not posted automatically until accountant confirms chart (D1).
 */
export class FinAccountsAndJournals1700000000037 implements MigrationInterface {
  name = 'FinAccountsAndJournals1700000000037';

  public async up(q: QueryRunner): Promise<void> {
    // ── fin_accounts ────────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS fin_accounts (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        code            VARCHAR(32) NOT NULL,
        name            VARCHAR(120) NOT NULL,
        type            VARCHAR(20) NOT NULL,
        subtype         VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
        description     TEXT NULL,
        cash_drawer_id  INTEGER NULL,
        branch_id       INTEGER NULL,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        is_system       BOOLEAN NOT NULL DEFAULT false,
        current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_fin_accounts_tenant_code UNIQUE (tenant_id, code)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_accounts_tenant_active ON fin_accounts (tenant_id, is_active)`);

    // ── fin_journals ────────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS fin_journals (
        id               SERIAL PRIMARY KEY,
        tenant_id        INTEGER NOT NULL,
        branch_id        INTEGER NULL,
        reference        VARCHAR(64) NOT NULL,
        type             VARCHAR(40) NOT NULL DEFAULT 'OTHER',
        journal_date     DATE NOT NULL,
        status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        description      TEXT NULL,
        idempotency_key  VARCHAR(128) NOT NULL,
        source_module    VARCHAR(64) NULL,
        source_id        INTEGER NULL,
        created_by_id    INTEGER NULL,
        approved_by_id   INTEGER NULL,
        posted_by_id     INTEGER NULL,
        reversed_by_id   INTEGER NULL,
        reversal_of_id   INTEGER NULL,
        approved_at      TIMESTAMPTZ NULL,
        posted_at        TIMESTAMPTZ NULL,
        reversed_at      TIMESTAMPTZ NULL,
        reason           TEXT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_fin_journals_tenant_idempotency UNIQUE (tenant_id, idempotency_key)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_journals_tenant_status ON fin_journals (tenant_id, status)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_journals_tenant_date ON fin_journals (tenant_id, journal_date)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_journals_tenant_ref ON fin_journals (tenant_id, reference)`);

    // ── fin_journal_lines ───────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS fin_journal_lines (
        id          SERIAL PRIMARY KEY,
        journal_id  INTEGER NOT NULL REFERENCES fin_journals(id) ON DELETE CASCADE,
        account_id  INTEGER NOT NULL REFERENCES fin_accounts(id),
        debit       NUMERIC(15,2) NOT NULL DEFAULT 0,
        credit      NUMERIC(15,2) NOT NULL DEFAULT 0,
        memo        TEXT NULL,
        line_order  INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT chk_fin_journal_lines_non_negative CHECK (debit >= 0 AND credit >= 0),
        CONSTRAINT chk_fin_journal_lines_one_side CHECK (
          (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
        )
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_journal_lines_journal ON fin_journal_lines (journal_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_fin_journal_lines_account ON fin_journal_lines (account_id)`);

    // ── Seed minimal chart for every existing tenant (editable later) ───────
    await q.query(`
      INSERT INTO fin_accounts (tenant_id, code, name, type, subtype, is_system, description)
      SELECT t.id, v.code, v.name, v.type, v.subtype, true, v.description
        FROM tenants t
       CROSS JOIN (VALUES
         ('1000', 'Cash Drawers (Control)',     'ASSET',     'CASH_DRAWER',              'Control account for physical cash drawers'),
         ('1100', 'Bank Accounts',              'ASSET',     'BANK',                     'Bank and mobile-money float'),
         ('1200', 'Officer-Held Cash',          'ASSET',     'OFFICER_HELD_CASH',        'Cash held by field officers'),
         ('1300', 'Down-Payment Receivable',    'ASSET',     'DOWN_PAYMENT_RECEIVABLE',  'Amounts still due on reservation deposits'),
         ('2000', 'Client Deposit Liabilities', 'LIABILITY', 'CLIENT_DEPOSIT_LIABILITY', 'Customer deposits held pending allocation'),
         ('2100', 'Fines Payable',              'LIABILITY', 'FINES_PAYABLE',            'Fines collected on behalf of third parties'),
         ('4000', 'Fines Income',               'INCOME',    'FINES_INCOME',             'Business fines income'),
         ('4100', 'Other Income',               'INCOME',    'OTHER_INCOME',             'Miscellaneous income'),
         ('5000', 'Operating Expenses',         'EXPENSE',   'GENERAL',                  'General operating expenses')
       ) AS v(code, name, type, subtype, description)
       ON CONFLICT (tenant_id, code) DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS fin_journal_lines`);
    await q.query(`DROP TABLE IF EXISTS fin_journals`);
    await q.query(`DROP TABLE IF EXISTS fin_accounts`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1700000000002-ExpenseAndReconciliationTables
 *
 * Creates the expense and reconciliation subsystem tables.
 * These were previously defined only in migration 1670000000000 but
 * NOT in init.sql, causing a broken schema on fresh deployments.
 *
 * Depends on: FoundationSchema1700000000001
 * (tenants, branches, users, cash_drawers must exist)
 *
 * Note: The old migration 1670000000000-AddExpenseAndReconciliationTables
 * is superseded by this one. Do not run both.
 */
export class ExpenseAndReconciliationTables1700000000002 implements MigrationInterface {
  name = 'ExpenseAndReconciliationTables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── EXPENSE_CATEGORIES ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id          SERIAL PRIMARY KEY,
        tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name        VARCHAR NOT NULL,
        description TEXT,
        created_at  TIMESTAMP NOT NULL DEFAULT now(),
        updated_at  TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── EXPENSES ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id             SERIAL PRIMARY KEY,
        tenant_id      INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id      INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        category_id    INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
        amount         DECIMAL(15,2) NOT NULL,
        description    TEXT NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        cash_drawer_id INTEGER REFERENCES cash_drawers(id) ON DELETE SET NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
        created_by_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        approved_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at    TIMESTAMP,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        updated_at     TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── EXPENSE_ATTACHMENTS ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expense_attachments (
        id          SERIAL PRIMARY KEY,
        expense_id  INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        file_url    VARCHAR NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── OFFICE_RECONCILIATIONS ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS office_reconciliations (
        id            SERIAL PRIMARY KEY,
        tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id     INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        drawer_id     INTEGER NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
        created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        expected_cash DECIMAL(15,2) NOT NULL,
        actual_cash   DECIMAL(15,2) NOT NULL,
        difference    DECIMAL(15,2) NOT NULL,
        reconciled_at TIMESTAMP NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_tenant   ON expenses(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_branch   ON expenses(branch_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_status   ON expenses(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_drawer   ON expenses(cash_drawer_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recon_tenant      ON office_reconciliations(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recon_drawer      ON office_reconciliations(drawer_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS office_reconciliations CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS expense_attachments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS expenses CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS expense_categories CASCADE;`);
  }
}

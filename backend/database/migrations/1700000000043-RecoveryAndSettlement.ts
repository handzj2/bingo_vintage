import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 — Recovery cases, inspections, settlement statements.
 * D7: record and report only — no automatic write-off or valuation offset.
 * D8: settlement shows both accrued-to-recovery and frozen views; posts nothing.
 */
export class RecoveryAndSettlement1700000000043 implements MigrationInterface {
  name = 'RecoveryAndSettlement1700000000043';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS recovery_cases (
        id                SERIAL PRIMARY KEY,
        tenant_id         INTEGER NOT NULL,
        branch_id         INTEGER NULL,
        loan_id           INTEGER NOT NULL,
        client_id         INTEGER NOT NULL,
        bike_id           INTEGER NULL,
        status            VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        case_type         VARCHAR(40) NOT NULL DEFAULT 'REPOSSESSION',
        authorised_by_id  INTEGER NULL,
        authorised_at     TIMESTAMPTZ NULL,
        authorisation_notes TEXT NULL,
        opened_by_id      INTEGER NULL,
        closed_at         TIMESTAMPTZ NULL,
        closed_by_id      INTEGER NULL,
        close_reason      TEXT NULL,
        notes             TEXT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_recovery_cases_loan ON recovery_cases (tenant_id, loan_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON recovery_cases (tenant_id, status)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS recovery_inspections (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        recovery_case_id INTEGER NOT NULL REFERENCES recovery_cases(id),
        inspected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        inspected_by_id INTEGER NULL,
        condition_notes TEXT NULL,
        estimated_value NUMERIC(15,2) NULL,
        odometer        INTEGER NULL,
        photos_count    INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_recovery_inspections_case ON recovery_inspections (recovery_case_id)`);

    await q.query(`
      CREATE TABLE IF NOT EXISTS recovery_settlements (
        id                    SERIAL PRIMARY KEY,
        tenant_id             INTEGER NOT NULL,
        recovery_case_id      INTEGER NOT NULL REFERENCES recovery_cases(id),
        loan_id               INTEGER NOT NULL,
        -- Snapshot figures at settlement time (report only — not posted)
        principal_outstanding NUMERIC(15,2) NOT NULL DEFAULT 0,
        accrued_interest      NUMERIC(15,2) NOT NULL DEFAULT 0,
        accrued_penalties     NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_outstanding     NUMERIC(15,2) NOT NULL DEFAULT 0,
        frozen_interest       NUMERIC(15,2) NOT NULL DEFAULT 0,
        frozen_penalties      NUMERIC(15,2) NOT NULL DEFAULT 0,
        frozen_total          NUMERIC(15,2) NOT NULL DEFAULT 0,
        bike_estimated_value  NUMERIC(15,2) NULL,
        -- Explicitly NOT applied: no auto offset (D7)
        offset_applied        NUMERIC(15,2) NOT NULL DEFAULT 0,
        write_off_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
        status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        notes                 TEXT NULL,
        prepared_by_id        INTEGER NULL,
        prepared_at           TIMESTAMPTZ NULL,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_settlement_no_silent_writeoff CHECK (write_off_amount = 0 OR status = 'AUTHORISED')
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_recovery_settlements_case ON recovery_settlements (recovery_case_id)`);

    await q.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('motorcycle_recovery.view',      'View recovery cases',    'motorcycle_recovery', 'view',      'View recovery cases and settlements', NULL),
        ('motorcycle_recovery.create',    'Open recovery case',     'motorcycle_recovery', 'create',    'Open a recovery case', NULL),
        ('motorcycle_recovery.authorise', 'Authorise recovery',     'motorcycle_recovery', 'authorise', 'Authorise recovery action', NULL),
        ('motorcycle_recovery.inspect',   'Record inspection',      'motorcycle_recovery', 'inspect',   'Record recovery inspection', NULL),
        ('motorcycle_recovery.settle',    'Prepare settlement',     'motorcycle_recovery', 'settle',    'Prepare recovery settlement statement', NULL)
      ON CONFLICT DO NOTHING
    `);
    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
        FROM roles r
        CROSS JOIN permissions p
       WHERE lower(r.name) IN ('admin', 'superadmin')
         AND p.code LIKE 'motorcycle_recovery.%'
         AND NOT EXISTS (
           SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_code = p.code
         )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS recovery_settlements`);
    await q.query(`DROP TABLE IF EXISTS recovery_inspections`);
    await q.query(`DROP TABLE IF EXISTS recovery_cases`);
  }
}

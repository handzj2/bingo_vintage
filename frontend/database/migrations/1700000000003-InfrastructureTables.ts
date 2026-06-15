import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1700000000003-InfrastructureTables
 *
 * Creates supporting infrastructure tables:
 *  - loan_alerts (cron-driven alert system)
 *  - password_reset_requests_v2 (secure token-based reset)
 *  - system_jobs (cron job audit trail)
 *  - cash_transactions (cash drawer audit trail)
 *
 * Depends on: FoundationSchema1700000000001
 */
export class InfrastructureTables1700000000003 implements MigrationInterface {
  name = 'InfrastructureTables1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── LOAN_ALERTS ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loan_alerts (
        id           SERIAL PRIMARY KEY,
        loan_id      INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        alert_type   VARCHAR(50) NOT NULL,
        message      TEXT NOT NULL,
        is_read      BOOLEAN NOT NULL DEFAULT false,
        is_resolved  BOOLEAN NOT NULL DEFAULT false,
        tenant_id    INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── PASSWORD_RESET_REQUESTS_V2 ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests_v2 (
        id                SERIAL PRIMARY KEY,
        user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reset_token       VARCHAR,
        temp_password     VARCHAR,
        status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'APPROVED', 'USED', 'EXPIRED', 'REJECTED')),
        requested_at      TIMESTAMP NOT NULL DEFAULT now(),
        approved_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at       TIMESTAMP,
        expires_at        TIMESTAMP,
        used_at           TIMESTAMP,
        created_at        TIMESTAMP NOT NULL DEFAULT now(),
        updated_at        TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── SYSTEM_JOBS ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_jobs (
        id                SERIAL PRIMARY KEY,
        job_name          VARCHAR(100) NOT NULL,
        status            VARCHAR(20) NOT NULL,
        records_processed INTEGER NOT NULL DEFAULT 0,
        started_at        TIMESTAMP,
        finished_at       TIMESTAMP,
        error_message     TEXT,
        created_at        TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── CASH_TRANSACTIONS (drawer audit trail) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cash_transactions (
        id               SERIAL PRIMARY KEY,
        drawer_id        INTEGER NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        amount           DECIMAL(12,2) NOT NULL,
        reference        VARCHAR(100),
        created_at       TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_alerts_loan_id  ON loan_alerts(loan_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_alerts_unread   ON loan_alerts(is_read) WHERE is_resolved = false;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_prr_v2_user     ON password_reset_requests_v2(user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_prr_v2_status   ON password_reset_requests_v2(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cash_transactions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_jobs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_requests_v2 CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS loan_alerts CASCADE;`);
  }
}

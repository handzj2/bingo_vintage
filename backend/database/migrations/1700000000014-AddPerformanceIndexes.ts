import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 6, Task 6.1 — Missing performance indexes
 *
 * The following high-frequency queries had no index support:
 *   GET /loans?status=ACTIVE          → loans.status
 *   Loan list scoped per tenant       → loans.tenant_id
 *   Schedule lookup per loan          → loan_schedules.loan_id (explicit)
 *   Payment lookup per loan           → payments.loan_id (explicit)
 *   Drawer open-check per tenant      → cash_drawers(tenant_id, status)
 */
export class AddPerformanceIndexes1700000000014 implements MigrationInterface {
  name = 'AddPerformanceIndexes1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_status           ON loans(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loans_tenant_id        ON loans(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_loan_id       ON payments(loan_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_schedules_loan_id      ON loan_schedules(loan_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_drawers_tenant_status  ON cash_drawers(tenant_id, status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loans_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loans_tenant_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_loan_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_schedules_loan_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_drawers_tenant_status`);
  }
}

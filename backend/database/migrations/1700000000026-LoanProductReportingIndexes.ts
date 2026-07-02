import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 026 — Loan Products reporting indexes
 *
 * Added ahead of Milestone 5 (Portfolio Reporting, Collections, Dashboard),
 * which joins loans to loan_products and filters loan_products by tenant
 * on every request. loans.loan_product_id is already indexed (migration
 * 025) — this adds the two indexes that were still missing.
 */
export class LoanProductReportingIndexes1700000000026 implements MigrationInterface {
  name = 'LoanProductReportingIndexes1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loan_products_tenant_id ON loan_products(tenant_id);
    `);
    // Composite covering (tenant_id, loan_product_id) on loans — the exact
    // pair every per-tenant, per-product reporting query filters/groups by.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loans_tenant_product
        ON loans(tenant_id, loan_product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loans_tenant_product;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loan_products_tenant_id;`);
  }
}

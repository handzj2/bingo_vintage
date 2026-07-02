import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 025 — loans.loan_product_id
 *
 * Adds the column LoansService.applyForLoan() needs to record which
 * tenant-owned LoanProduct (if any) a loan was created from. Nullable:
 * every existing loan predates this feature and has no product
 * association — this is purely additive, no backfill, no existing row
 * touched.
 *
 * ON DELETE RESTRICT: a loan_products row that has been used by at least
 * one real loan should not be silently deletable — the existing
 * LoanProductsService.remove() will fail with a foreign key violation in
 * that case, which is the correct behavior (use is_active=false to retire
 * a product instead of deleting one with loan history).
 */
export class LoanProductIdOnLoans1700000000025 implements MigrationInterface {
  name = 'LoanProductIdOnLoans1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loans' AND column_name = 'loan_product_id'
        ) THEN
          ALTER TABLE loans ADD COLUMN loan_product_id INTEGER NULL
            REFERENCES loan_products(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loans_loan_product_id ON loans(loan_product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_loans_loan_product_id;`);
    await queryRunner.query(`ALTER TABLE loans DROP COLUMN IF EXISTS loan_product_id;`);
  }
}

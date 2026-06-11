import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1, Task 1.2
 * Adds tenant_id and branch_id to the payments table.
 * The Payment entity maps both columns — without them every payment
 * write throws: column "tenant_id" of relation "payments" does not exist.
 *
 * Backfills tenant_id from the linked loan so existing rows are valid.
 * branch_id is nullable — left NULL for existing rows (no canonical source).
 */
export class AddTenantAndBranchToPayments1700000000012 implements MigrationInterface {
  name = 'AddTenantAndBranchToPayments1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL
    `);

    // Backfill tenant_id from the linked loan
    await queryRunner.query(`
      UPDATE payments p
         SET tenant_id = l.tenant_id
        FROM loans l
       WHERE p.loan_id = l.id
         AND p.tenant_id IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_tenant`);
    await queryRunner.query(`
      ALTER TABLE payments
        DROP COLUMN IF EXISTS tenant_id,
        DROP COLUMN IF EXISTS branch_id
    `);
  }
}

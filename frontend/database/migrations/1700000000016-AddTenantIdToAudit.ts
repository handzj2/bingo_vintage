import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToAudit1700000000016 implements MigrationInterface {
  name = 'AddTenantIdToAudit1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit
        ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit(tenant_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_tenant`);
    await queryRunner.query(`ALTER TABLE audit DROP COLUMN IF EXISTS tenant_id`);
  }
}

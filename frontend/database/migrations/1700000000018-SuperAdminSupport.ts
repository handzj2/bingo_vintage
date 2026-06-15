import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdminSupport1700000000018 implements MigrationInterface {
  name = 'SuperAdminSupport1700000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Allow tenant_id to be NULL for superadmin users
    await queryRunner.query(`
      ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
    `);

    // Create superadmin tenant (id=0 placeholder)
    await queryRunner.query(`
      INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
      VALUES (0, 'Super Admin', 'superadmin', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create superadmin role in the superadmin tenant
    await queryRunner.query(`
      INSERT INTO roles (name, tenant_id, created_at, updated_at)
      SELECT 'superadmin', 0, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE name = 'superadmin' AND tenant_id = 0
      );
    `);

    // Add is_superadmin flag to users for quick checks
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS is_superadmin;`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;`);
  }
}

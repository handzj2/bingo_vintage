import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3, Task 3.5 — Seed default expense categories for tenant 1.
 *
 * Without categories the expense form dropdown is empty on fresh install
 * and no expense can be submitted.  ON CONFLICT DO NOTHING makes this
 * idempotent — safe to run on an existing database.
 */
export class SeedExpenseCategories1700000000015 implements MigrationInterface {
  name = 'SeedExpenseCategories1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fixed: uses dynamic tenant lookup instead of hardcoded id=1
    // Safe to run on any database regardless of tenant sequence id
    await queryRunner.query(`
      INSERT INTO expense_categories (tenant_id, name, description, created_at)
      SELECT t.id, c.name, c.description, now()
      FROM tenants t
      CROSS JOIN (VALUES
        ('Utilities',   'Electricity, water, internet'),
        ('Rent',        'Office or branch rent'),
        ('Maintenance', 'Bike and office maintenance'),
        ('Salaries',    'Staff salaries and wages'),
        ('Transport',   'Fuel, transport, logistics'),
        ('Office',      'Stationery and office supplies'),
        ('Marketing',   'Advertising and promotions'),
        ('Other',       'Miscellaneous expenses')
      ) AS c(name, description)
      WHERE t.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM expense_categories ec
        WHERE ec.tenant_id = t.id AND ec.name = c.name
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded categories from all tenants — slug-based to avoid hardcoded ids
    await queryRunner.query(`
      DELETE FROM expense_categories
       WHERE name IN ('Utilities','Rent','Maintenance','Salaries',
                      'Transport','Office','Marketing','Other')
         AND tenant_id IN (SELECT id FROM tenants WHERE is_active = true)
    `);
  }
}
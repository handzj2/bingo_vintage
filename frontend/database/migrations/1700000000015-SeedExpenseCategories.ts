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
    await queryRunner.query(`
      INSERT INTO expense_categories (tenant_id, name, description, created_at)
      VALUES
        (1, 'Utilities',    'Electricity, water, internet',        now()),
        (1, 'Rent',         'Office or branch rent',               now()),
        (1, 'Maintenance',  'Bike and office maintenance',         now()),
        (1, 'Salaries',     'Staff salaries and wages',            now()),
        (1, 'Transport',    'Fuel, transport, logistics',          now()),
        (1, 'Office',       'Stationery and office supplies',      now()),
        (1, 'Marketing',    'Advertising and promotions',          now()),
        (1, 'Other',        'Miscellaneous expenses',              now())
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM expense_categories
       WHERE tenant_id = 1
         AND name IN ('Utilities','Rent','Maintenance','Salaries',
                      'Transport','Office','Marketing','Other')
    `);
  }
}
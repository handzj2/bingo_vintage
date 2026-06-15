import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingCashDrawerColumns1700000000011 implements MigrationInterface {
  name = 'AddMissingCashDrawerColumns1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cash_drawers"
        ADD COLUMN IF NOT EXISTS "current_balance"   DECIMAL(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "closing_balance"   DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS "expected_balance"  DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS "difference"        DECIMAL(15,2),
        ADD COLUMN IF NOT EXISTS "status"            VARCHAR(20) NOT NULL DEFAULT 'open',
        ADD COLUMN IF NOT EXISTS "closed_at"         TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cash_drawers"
        DROP COLUMN IF EXISTS "current_balance",
        DROP COLUMN IF EXISTS "closing_balance",
        DROP COLUMN IF EXISTS "expected_balance",
        DROP COLUMN IF EXISTS "difference",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "closed_at"
    `);
  }
}
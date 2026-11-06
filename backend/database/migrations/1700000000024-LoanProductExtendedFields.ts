import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 024 — Loan Products: extended fields
 *
 * Adds: code, category, interest_type, calculation_method,
 * requires_approval, sort_order.
 *
 * Backfill uses loan_type (foundation schema column), not product_type.
 */
export class LoanProductExtendedFields1700000000024 implements MigrationInterface {
  name = 'LoanProductExtendedFields1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_products_interest_type_enum') THEN
          CREATE TYPE loan_products_interest_type_enum AS ENUM ('FLAT', 'REDUCING');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'code'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN code VARCHAR(50);
        END IF;
      END $$;
    `);
    await queryRunner.query(`UPDATE loan_products SET code = loan_type::text WHERE code IS NULL;`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'category'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN category VARCHAR(50);
        END IF;
      END $$;
    `);
    await queryRunner.query(`UPDATE loan_products SET category = loan_type::text WHERE category IS NULL;`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'interest_type'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN interest_type loan_products_interest_type_enum NOT NULL DEFAULT 'FLAT';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'calculation_method'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN calculation_method VARCHAR(50);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      UPDATE loan_products SET calculation_method =
        CASE WHEN loan_type = 'bike' THEN 'weekly_flat' ELSE 'monthly_flat' END
      WHERE calculation_method IS NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'requires_approval'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'loan_products' AND column_name = 'sort_order'
        ) THEN
          ALTER TABLE loan_products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS sort_order;`);
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS requires_approval;`);
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS calculation_method;`);
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS interest_type;`);
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS category;`);
    await queryRunner.query(`ALTER TABLE loan_products DROP COLUMN IF EXISTS code;`);
    await queryRunner.query(`DROP TYPE IF EXISTS loan_products_interest_type_enum;`);
  }
}

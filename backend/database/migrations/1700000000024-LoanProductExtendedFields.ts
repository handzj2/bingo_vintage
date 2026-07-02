import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 024 — Loan Products: extended fields
 *
 * loan_products already exists (confirmed live, 15 columns, currently
 * empty — no tenant has been given a product through any process yet).
 * This migration adds six new columns needed for the product-driven
 * roadmap, without renaming or removing anything already there.
 *
 *   code               — short stable identifier, distinct from the
 *                         human-editable `name`. Backfilled from
 *                         product_type for the (currently zero) existing
 *                         rows, since no rows exist this is a no-op today
 *                         but keeps the migration correct if it's ever run
 *                         against a database that already has data.
 *   category           — groups products for future cross-product rules
 *                         (e.g. "a Side Loan requires an active loan in
 *                         the cash category") without hardcoding any
 *                         specific product's name or id in that rule.
 *   interest_type      — FLAT / REDUCING. Declared now; only FLAT has a
 *                         real calculation anywhere in this codebase.
 *                         Enabling REDUCING requires its own approved
 *                         business rules and a new calculation
 *                         implementation — not part of this migration.
 *   calculation_method — free-text slot for how a product's schedule is
 *                         actually computed (e.g. 'monthly_flat',
 *                         'weekly_flat') — lets LoansService resolve
 *                         behavior from data instead of branching on
 *                         product_type.
 *   requires_approval  — whether loans of this product need an explicit
 *                         approval step before disbursement. Defaults to
 *                         true, matching every existing loan-creation
 *                         path's current behavior (all loans currently
 *                         start PENDING_APPROVAL).
 *   sort_order         — display ordering for product-selection UIs.
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
    await queryRunner.query(`UPDATE loan_products SET code = product_type::text WHERE code IS NULL;`);

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
    await queryRunner.query(`UPDATE loan_products SET category = product_type::text WHERE category IS NULL;`);

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
        CASE WHEN product_type = 'bike' THEN 'weekly_flat' ELSE 'monthly_flat' END
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

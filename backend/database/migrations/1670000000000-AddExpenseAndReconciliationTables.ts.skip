import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpenseAndReconciliationTables1670000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // expense_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_categories" (
        "id" SERIAL NOT NULL,
        "tenant_id" int NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_categories" PRIMARY KEY ("id")
      )
    `);

    // expenses
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id" SERIAL NOT NULL,
        "tenant_id" int NOT NULL,
        "branch_id" int,
        "category_id" int NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "description" text NOT NULL,
        "payment_method" varchar(50) NOT NULL,
        "cash_drawer_id" int,
        "status" varchar DEFAULT 'pending',
        "created_by_id" int NOT NULL,
        "approved_by_id" int,
        "approved_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses" PRIMARY KEY ("id")
      )
    `);

    // expense_attachments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_attachments" (
        "id" SERIAL NOT NULL,
        "expense_id" int NOT NULL,
        "file_url" varchar NOT NULL,
        "uploaded_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_attachments" PRIMARY KEY ("id")
      )
    `);

    // office_reconciliations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "office_reconciliations" (
        "id" SERIAL NOT NULL,
        "tenant_id" int NOT NULL,
        "branch_id" int,
        "drawer_id" int NOT NULL,
        "expected_cash" decimal(15,2) NOT NULL,
        "actual_cash" decimal(15,2) NOT NULL,
        "difference" decimal(15,2) NOT NULL,
        "created_by_id" int NOT NULL,
        "reconciled_at" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_office_reconciliations" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys (only added if they don't exist yet)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expense_categories_tenant') THEN
          ALTER TABLE "expense_categories"
            ADD CONSTRAINT "FK_expense_categories_tenant"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_tenant') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_branch') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_category') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_cash_drawer') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_cash_drawer" FOREIGN KEY ("cash_drawer_id") REFERENCES "cash_drawers"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_created_by') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expenses_approved_by') THEN
          ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_approved_by" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_expense_attachments_expense') THEN
          ALTER TABLE "expense_attachments" ADD CONSTRAINT "FK_expense_attachments_expense" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_office_reconciliations_tenant') THEN
          ALTER TABLE "office_reconciliations" ADD CONSTRAINT "FK_office_reconciliations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_office_reconciliations_branch') THEN
          ALTER TABLE "office_reconciliations" ADD CONSTRAINT "FK_office_reconciliations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_office_reconciliations_drawer') THEN
          ALTER TABLE "office_reconciliations" ADD CONSTRAINT "FK_office_reconciliations_drawer" FOREIGN KEY ("drawer_id") REFERENCES "cash_drawers"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_office_reconciliations_created_by') THEN
          ALTER TABLE "office_reconciliations" ADD CONSTRAINT "FK_office_reconciliations_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "office_reconciliations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_categories"`);
  }
}
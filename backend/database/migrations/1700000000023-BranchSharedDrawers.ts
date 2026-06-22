import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 023 — Branch-shared cash drawers
 *
 * Business rule change: a cash drawer is now owned by a BRANCH, not by the
 * cashier who opened it. Multiple cashiers working the same physical till
 * at the same branch all transact against the SAME open drawer — no more
 * close-then-reopen handover required between shift changes within a day.
 *
 * userId keeps its original meaning ("who opened this drawer") for the
 * audit trail. This migration adds closed_by_id ("who closed it") since
 * that may now be a different cashier than the one who opened it.
 *
 * Individual accountability is NOT lost: payments.created_by_id and
 * expenses.created_by_id already independently record which cashier
 * performed each specific transaction, regardless of who the drawer's
 * userId/closedById are.
 */
export class BranchSharedDrawers1700000000023 implements MigrationInterface {
  name = 'BranchSharedDrawers1700000000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cash_drawers' AND column_name = 'closed_by_id'
        ) THEN
          ALTER TABLE cash_drawers ADD COLUMN closed_by_id INTEGER REFERENCES users(id);
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cash_drawers DROP COLUMN IF EXISTS closed_by_id;`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Split payment_allocations into instalment vs penalty components.
 * amount_applied remains the total (instalment_applied + penalty_applied).
 * Legacy rows: instalment_applied = amount_applied, penalty_applied = 0.
 */
export class PaymentAllocationPenaltySplit1700000000030 implements MigrationInterface {
  name = 'PaymentAllocationPenaltySplit1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_allocations
        ADD COLUMN IF NOT EXISTS instalment_applied DECIMAL(12,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE payment_allocations
        ADD COLUMN IF NOT EXISTS penalty_applied DECIMAL(12,2) NOT NULL DEFAULT 0
    `);
    // Backfill legacy rows once
    await queryRunner.query(`
      UPDATE payment_allocations
         SET instalment_applied = amount_applied,
             penalty_applied = 0
       WHERE instalment_applied = 0
         AND penalty_applied = 0
         AND amount_applied > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_allocations DROP COLUMN IF EXISTS instalment_applied
    `);
    await queryRunner.query(`
      ALTER TABLE payment_allocations DROP COLUMN IF EXISTS penalty_applied
    `);
  }
}

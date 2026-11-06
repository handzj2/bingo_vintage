import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddPaymentAllocations
 *
 * Uses schedule_status_enum (created by FoundationSchema), not
 * loan_schedules_status_enum (which does not exist).
 */
export class AddPaymentAllocations1700000000027 implements MigrationInterface {
  name = 'AddPaymentAllocations1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id               SERIAL PRIMARY KEY,
        payment_id       INTEGER NOT NULL
                           REFERENCES payments(id) ON DELETE CASCADE,
        schedule_id      INTEGER NOT NULL
                           REFERENCES loan_schedules(id) ON DELETE CASCADE,
        amount_applied   NUMERIC(12,2) NOT NULL,
        previous_status  schedule_status_enum NOT NULL,
        new_status       schedule_status_enum NOT NULL,
        reversed_at      TIMESTAMP NULL,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id
        ON payment_allocations(payment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_allocations_schedule_id
        ON payment_allocations(schedule_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_allocations_schedule_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_allocations_payment_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_allocations`);
  }
}

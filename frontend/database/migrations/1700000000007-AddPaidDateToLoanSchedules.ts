import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidDateToLoanSchedules1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_schedules"
      ADD COLUMN IF NOT EXISTS "paid_date" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_schedules"
      DROP COLUMN IF EXISTS "paid_date"
    `);
  }
}

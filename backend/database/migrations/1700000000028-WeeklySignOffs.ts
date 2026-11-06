import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WeeklySignOffs — MD / admin / manager formal weekly collection accountability.
 * Stores a signed snapshot of the weekly pack (system collections vs declared
 * drawer closes, exceptions). Does not alter payment or drawer rows.
 */
export class WeeklySignOffs1700000000028 implements MigrationInterface {
  name = 'WeeklySignOffs1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weekly_sign_offs (
        id              SERIAL PRIMARY KEY,
        tenant_id       INT NOT NULL,
        branch_id       INT NULL,
        week_start      DATE NOT NULL,
        week_end        DATE NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'SIGNED',
        notes           TEXT NULL,
        summary_json    JSONB NOT NULL DEFAULT '{}',
        signed_by_id    INT NOT NULL,
        signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_weekly_sign_off_scope
          UNIQUE (tenant_id, branch_id, week_start, week_end)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_weekly_sign_offs_tenant_week
        ON weekly_sign_offs (tenant_id, week_start DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS weekly_sign_offs`);
  }
}

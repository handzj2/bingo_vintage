import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — RESERVED bike status + status history.
 * Extends the existing bikes.status enum and records every transition.
 */
export class BikeReservedAndHistory1700000000040 implements MigrationInterface {
  name = 'BikeReservedAndHistory1700000000040';

  public async up(q: QueryRunner): Promise<void> {
    // Add new enum values (PostgreSQL ALTER TYPE ... ADD VALUE is non-transactional
    // but safe here; values are only additive).
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'RESERVED'`);
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'RECOVERY_PENDING'`);
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'RECOVERED'`);
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'UNDER_INSPECTION'`);
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'UNDER_REPAIR'`);
    await q.query(`ALTER TYPE bikes_status_enum ADD VALUE IF NOT EXISTS 'RECOVERY_CLEARED'`);

    // History table
    await q.query(`
      CREATE TABLE IF NOT EXISTS bike_status_history (
        id             SERIAL PRIMARY KEY,
        tenant_id      INTEGER NOT NULL,
        bike_id        INTEGER NOT NULL REFERENCES bikes(id),
        from_status    VARCHAR(32) NULL,
        to_status      VARCHAR(32) NOT NULL,
        changed_by_id  INTEGER NULL,
        reason         TEXT NULL,
        reference_type VARCHAR(64) NULL,
        reference_id   INTEGER NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_bike_status_history_bike ON bike_status_history (bike_id, created_at)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_bike_status_history_tenant ON bike_status_history (tenant_id, bike_id)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS bike_status_history`);
    // Enum values cannot be removed safely once added; leave them.
  }
}

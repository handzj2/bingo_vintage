import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — attachment metadata.
 * Binary content lives in private Supabase storage (D6). This table only holds references.
 */
export class Attachments1700000000039 implements MigrationInterface {
  name = 'Attachments1700000000039';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id             SERIAL PRIMARY KEY,
        tenant_id      INTEGER NOT NULL,
        branch_id      INTEGER NULL,
        entity_type    VARCHAR(64) NOT NULL,
        entity_id      INTEGER NOT NULL,
        file_name      VARCHAR(255) NOT NULL,
        mime_type      VARCHAR(128) NOT NULL,
        size_bytes     BIGINT NOT NULL,
        storage_key    VARCHAR(512) NOT NULL,
        storage_bucket VARCHAR(128) NOT NULL DEFAULT 'bingo-private',
        uploaded_by_id INTEGER NULL,
        description    TEXT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_attachments_entity
        ON attachments (tenant_id, entity_type, entity_id)
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS attachments`);
  }
}

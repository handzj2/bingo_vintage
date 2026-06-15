/**
 * Migration rollback test — verifies DOWN migrations execute without error.
 *
 * Why this matters:
 *   Down migrations with backfill logic (like the reversal_status backfill in
 *   migration 017) must be tested explicitly. A broken DOWN script discovered
 *   during a production incident adds minutes of stress to an already
 *   difficult rollback.
 *
 * Run:
 *   DATABASE_URL=<test-db-url> npx jest test/migration-rollback.spec.ts
 *
 * The test runs the most recent migration's DOWN script and verifies the
 * schema returns to the expected state. It then re-runs UP to restore.
 */

import { DataSource } from 'typeorm';
import { AddReversalStatusToPayments1700000000017 } from
  '../database/migrations/1700000000017-AddReversalStatusToPayments';

describe('Migration 017 — rollback safety', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      url:  process.env.DATABASE_URL,
      synchronize: false,
      logging: false,
    });
    await ds.initialize();
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('DOWN removes reversal_status column and enum without error', async () => {
    const migration = new AddReversalStatusToPayments1700000000017();
    const qr = ds.createQueryRunner();
    await qr.connect();

    // Run DOWN
    await expect(migration.down(qr)).resolves.not.toThrow();

    // Verify column is gone
    const cols: any[] = await qr.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'payments' AND column_name = 'reversal_status'
    `);
    expect(cols.length).toBe(0);

    // Re-run UP to restore state for subsequent tests
    await migration.up(qr);

    // Verify column is back
    const restored: any[] = await qr.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'payments' AND column_name = 'reversal_status'
    `);
    expect(restored.length).toBe(1);

    await qr.release();
  });
});

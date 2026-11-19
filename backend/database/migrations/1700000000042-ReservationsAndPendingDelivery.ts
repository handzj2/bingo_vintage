import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — Reservations, handovers, APPROVED_PENDING_DELIVERY loan status.
 * Additive. Existing ACTIVE loans and schedules are untouched.
 */
export class ReservationsAndPendingDelivery1700000000042 implements MigrationInterface {
  name = 'ReservationsAndPendingDelivery1700000000042';

  public async up(q: QueryRunner): Promise<void> {
    // Loan status enum value
    // Enum type name differs by environment (production: loans_status_enum; migration-built: loan_status_enum).
    const [col] = await q.query(
      `SELECT t.typname AS typname
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid AND c.relname = 'loans' AND c.relnamespace = 'public'::regnamespace
         JOIN pg_type t ON t.oid = a.atttypid
        WHERE a.attname = 'status' AND NOT a.attisdropped AND t.typtype = 'e'`,
    );
    if (!col) throw new Error('loans.status is not an enum column; cannot add APPROVED_PENDING_DELIVERY');
    await q.query(`ALTER TYPE "${col.typname}" ADD VALUE IF NOT EXISTS 'APPROVED_PENDING_DELIVERY'`);

    // reservations
    await q.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        branch_id       INTEGER NULL,
        client_id       INTEGER NOT NULL,
        bike_id         INTEGER NULL,
        status          VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        agreed_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
        deposit_required NUMERIC(15,2) NOT NULL DEFAULT 0,
        deposit_received NUMERIC(15,2) NOT NULL DEFAULT 0,
        loan_id         INTEGER NULL,
        notes           TEXT NULL,
        created_by_id   INTEGER NULL,
        cancelled_at    TIMESTAMPTZ NULL,
        cancelled_by_id INTEGER NULL,
        cancel_reason   TEXT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_reservations_tenant_status ON reservations (tenant_id, status)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations (tenant_id, client_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_reservations_bike ON reservations (bike_id) WHERE bike_id IS NOT NULL`);

    // handovers
    await q.query(`
      CREATE TABLE IF NOT EXISTS handovers (
        id              SERIAL PRIMARY KEY,
        tenant_id       INTEGER NOT NULL,
        reservation_id  INTEGER NOT NULL REFERENCES reservations(id),
        loan_id         INTEGER NOT NULL,
        bike_id         INTEGER NOT NULL,
        handed_over_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        handed_over_by  INTEGER NULL,
        notes           TEXT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_handover_loan UNIQUE (loan_id)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_handovers_reservation ON handovers (reservation_id)`);

    // Permissions
    await q.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('reservations.view',     'View reservations',     'reservations', 'view',   'View motorcycle reservations', NULL),
        ('reservations.create',   'Create reservations',   'reservations', 'create', 'Create reservations', NULL),
        ('reservations.allocate', 'Allocate bike',         'reservations', 'allocate','Allocate motorcycle to reservation', NULL),
        ('reservations.activate', 'Activate loan',         'reservations', 'activate','Handover and activate pending-delivery loan', NULL),
        ('reservations.cancel',   'Cancel reservations',   'reservations', 'cancel', 'Cancel a reservation', NULL)
      ON CONFLICT DO NOTHING
    `);
    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
        FROM roles r
        CROSS JOIN permissions p
       WHERE lower(r.name) IN ('admin', 'superadmin')
         AND p.code LIKE 'reservations.%'
         AND NOT EXISTS (
           SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_code = p.code
         )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS handovers`);
    await q.query(`DROP TABLE IF EXISTS reservations`);
    // enum value left in place (Postgres cannot remove enum values safely)
  }
}

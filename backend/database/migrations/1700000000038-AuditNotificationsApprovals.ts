import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — audit column extensions, notifications, approval_policies.
 * Additive only. Existing audit rows remain valid (new columns nullable).
 */
export class AuditNotificationsApprovals1700000000038 implements MigrationInterface {
  name = 'AuditNotificationsApprovals1700000000038';

  public async up(q: QueryRunner): Promise<void> {
    // ── Extend audit table ──────────────────────────────────────────────────
    await q.query(`
      ALTER TABLE audit
        ADD COLUMN IF NOT EXISTS branch_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS reason TEXT NULL
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_audit_tenant_branch ON audit (tenant_id, branch_id)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit (correlation_id) WHERE correlation_id IS NOT NULL`);

    // ── notifications ───────────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id           SERIAL PRIMARY KEY,
        tenant_id    INTEGER NOT NULL,
        user_id      INTEGER NOT NULL,
        branch_id    INTEGER NULL,
        type         VARCHAR(64) NOT NULL,
        title        VARCHAR(200) NOT NULL,
        body         TEXT NULL,
        link_path    VARCHAR(255) NULL,
        entity_type  VARCHAR(64) NULL,
        entity_id    INTEGER NULL,
        is_read      BOOLEAN NOT NULL DEFAULT false,
        read_at      TIMESTAMPTZ NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (tenant_id, user_id, is_read)`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (tenant_id, created_at DESC)`);

    // ── approval_policies ───────────────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS approval_policies (
        id                 SERIAL PRIMARY KEY,
        tenant_id          INTEGER NOT NULL,
        operation_type     VARCHAR(64) NOT NULL,
        requires_approval  BOOLEAN NOT NULL DEFAULT true,
        distinct_approver  BOOLEAN NOT NULL DEFAULT true,
        min_approvers      INTEGER NOT NULL DEFAULT 1,
        is_active          BOOLEAN NOT NULL DEFAULT true,
        description        TEXT NULL,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_approval_policies_tenant_op UNIQUE (tenant_id, operation_type)
      )
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_approval_policies_active ON approval_policies (tenant_id, is_active)`);

    // Seed default policies for every tenant (D4 safe default: distinct approver)
    await q.query(`
      INSERT INTO approval_policies (tenant_id, operation_type, requires_approval, distinct_approver, description)
      SELECT t.id, v.op, true, true, v.descr
        FROM tenants t
       CROSS JOIN (VALUES
         ('FIN_JOURNAL_POST',   'Posting any financial journal'),
         ('MONEY_IN',           'Recording money received (non-loan)'),
         ('MONEY_OUT',          'Recording money paid out'),
         ('TRANSFER',           'Internal cash/bank transfers'),
         ('CLIENT_DEPOSIT',     'Client deposit receipt'),
         ('CLIENT_REFUND',      'Client deposit refund'),
         ('FINE',               'Fine recording'),
         ('FIELD_COLLECTION',   'Field collection batch'),
         ('REMITTANCE',         'Remittance batch completion')
       ) AS v(op, descr)
       ON CONFLICT (tenant_id, operation_type) DO NOTHING
    `);

    // Widen permissions.action CHECK (001 only allows create/read/update/delete/approve/reverse/export)
    // so the new action verbs below are valid. Existing values stay valid.
    await q.query(`ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_action_check`);
    await q.query(`
      ALTER TABLE permissions ADD CONSTRAINT permissions_action_check
      CHECK (action IN (
        'create','read','update','delete','approve','reverse','export',
        'view','post','manage','upload','allocate','activate','cancel',
        'authorise','inspect','settle'
      ))
    `);

    // New permission keys (admin only per D5)
    await q.query(`
      INSERT INTO permissions (code, name, resource, action, description, tenant_id)
      VALUES
        ('finance.journal.view',   'View journals',          'finance', 'view',   'View accounting journals', NULL),
        ('finance.journal.post',   'Post journals',          'finance', 'post',   'Approve and post journals', NULL),
        ('finance.account.manage', 'Manage chart of accounts','finance', 'manage', 'Edit chart of accounts', NULL),
        ('notification.view',      'View notifications',     'notification', 'view', 'View own notifications', NULL),
        ('attachment.upload',      'Upload attachments',     'attachment', 'upload', 'Upload evidence files', NULL),
        ('attachment.view',        'View attachments',       'attachment', 'view',  'View attached evidence', NULL)
      ON CONFLICT DO NOTHING
    `);

    // Grant new permissions to existing admin roles only
    await q.query(`
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT r.id, p.code, r.tenant_id
        FROM roles r
        CROSS JOIN permissions p
       WHERE lower(r.name) IN ('admin', 'superadmin')
         AND p.code IN (
           'finance.journal.view', 'finance.journal.post', 'finance.account.manage',
           'notification.view', 'attachment.upload', 'attachment.view'
         )
         AND NOT EXISTS (
           SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_code = p.code
         )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS approval_policies`);
    await q.query(`DROP TABLE IF EXISTS notifications`);
    await q.query(`
      ALTER TABLE audit
        DROP COLUMN IF EXISTS branch_id,
        DROP COLUMN IF EXISTS correlation_id,
        DROP COLUMN IF EXISTS reason
    `);
    // Permissions left in place on down — safer than deleting grants
  }
}

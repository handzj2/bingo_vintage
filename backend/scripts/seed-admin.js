/**
 * Seed default tenant + admin user for Bingo Vintage.
 *
 * Usage (from backend folder):
 *   node scripts/seed-admin.js
 *
 * Login: admin / Admin@123
 *
 * role_permissions schema uses permission_code (not permission_id).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@bingo.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || 'System Administrator';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  console.log('Connected to database');

  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO tenants (name, slug, description, is_active, created_at, updated_at)
      SELECT 'Bingo Vintage', 'bingo-vintage', 'Motorcycle Loan Management', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'bingo-vintage')
    `);

    const tenantRes = await client.query(
      `SELECT id FROM tenants WHERE slug = 'bingo-vintage' LIMIT 1`,
    );
    const tenantId = tenantRes.rows[0]?.id;
    if (!tenantId) throw new Error('Failed to resolve tenant bingo-vintage');

    await client.query(
      `
      INSERT INTO branches (tenant_id, name, location, is_active, created_at, updated_at)
      SELECT $1, 'Main Branch', 'Kampala', true, now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM branches WHERE tenant_id = $1 AND name = 'Main Branch'
      )
    `,
      [tenantId],
    );

    const branchRes = await client.query(
      `SELECT id FROM branches WHERE tenant_id = $1 AND name = 'Main Branch' LIMIT 1`,
      [tenantId],
    );
    const branchId = branchRes.rows[0]?.id;

    await client.query(
      `
      INSERT INTO roles (tenant_id, name, description, is_default, created_at, updated_at)
      SELECT $1, 'admin', 'System administrator with full access', false, now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM roles WHERE tenant_id = $1 AND name = 'admin'
      )
    `,
      [tenantId],
    );

    const roleRes = await client.query(
      `SELECT id FROM roles WHERE tenant_id = $1 AND name = 'admin' LIMIT 1`,
      [tenantId],
    );
    const roleId = roleRes.rows[0]?.id;
    if (!roleId) throw new Error('Failed to resolve admin role');

    // Schema uses permission_code (VARCHAR FK to permissions.code), not permission_id
    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_code, tenant_id)
      SELECT $1, p.code, $2
      FROM permissions p
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = $1 AND rp.permission_code = p.code
      )
    `,
      [roleId, tenantId],
    );

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const existing = await client.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
      [ADMIN_USERNAME, ADMIN_EMAIL],
    );

    if (existing.rows.length) {
      await client.query(
        `
        UPDATE users SET
          password_hash = $1,
          role_id = $2,
          tenant_id = $3,
          branch_id = $4,
          is_active = true,
          full_name = COALESCE(full_name, $5),
          must_change_password = false
        WHERE id = $6
      `,
        [hash, roleId, tenantId, branchId, ADMIN_FULL_NAME, existing.rows[0].id],
      );
      console.log('Updated existing user id=' + existing.rows[0].id);
    } else {
      await client.query(
        `
        INSERT INTO users (
          username, email, password_hash, full_name,
          role_id, tenant_id, branch_id, is_active,
          must_change_password, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, true,
          false, now(), now()
        )
      `,
        [
          ADMIN_USERNAME,
          ADMIN_EMAIL,
          hash,
          ADMIN_FULL_NAME,
          roleId,
          tenantId,
          branchId,
        ],
      );
      console.log('Created admin user');
    }

    await client.query('COMMIT');

    console.log('');
    console.log('========================================');
    console.log(' Default admin ready');
    console.log(' Username:', ADMIN_USERNAME);
    console.log(' Email:   ', ADMIN_EMAIL);
    console.log(' Password:', ADMIN_PASSWORD);
    console.log(' Tenant:  bingo-vintage (id=' + tenantId + ')');
    console.log(' Branch:  Main Branch (id=' + (branchId || 'n/a') + ')');
    console.log(' Role:    admin (id=' + roleId + ')');
    console.log('========================================');
    console.log('Change this password after first login.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

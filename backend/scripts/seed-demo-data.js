/**
 * Seed minimal demo data so reports and dashboard show non-zero figures.
 * Does NOT replace seed-admin.js — run after admin exists.
 *
 * Usage: node scripts/seed-demo-data.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log('Connected');

  try {
    await client.query('BEGIN');

    const t = await client.query(`SELECT id FROM tenants WHERE slug = 'bingo-vintage' LIMIT 1`);
    if (!t.rows.length) throw new Error('Tenant bingo-vintage not found — run seed-admin.js first');
    const tenantId = t.rows[0].id;

    const b = await client.query(
      `SELECT id FROM branches WHERE tenant_id = $1 ORDER BY id LIMIT 1`,
      [tenantId],
    );
    const branchId = b.rows[0]?.id || null;

    // Product
    await client.query(
      `
      INSERT INTO loan_products (tenant_id, name, loan_type, interest_model, interest_rate, min_amount, max_amount, min_term_months, max_term_months, processing_fee, is_active)
      SELECT $1, 'Demo Cash Weekly', 'cash', 'FLAT', 10.00, 100000, 5000000, 1, 12, 0, true
      WHERE NOT EXISTS (SELECT 1 FROM loan_products WHERE tenant_id = $1 AND name = 'Demo Cash Weekly')
    `,
      [tenantId],
    );
    const prod = await client.query(
      `SELECT id FROM loan_products WHERE tenant_id = $1 AND name = 'Demo Cash Weekly' LIMIT 1`,
      [tenantId],
    );
    const productId = prod.rows[0].id;

    // Client
    await client.query(
      `
      INSERT INTO clients (first_name, last_name, full_name, phone, status, tenant_id, branch_id, monthly_income)
      SELECT 'Demo', 'Borrower', 'Demo Borrower', '0700000001', 'active', $1, $2, 500000
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE phone = '0700000001' AND tenant_id = $1)
    `,
      [tenantId, branchId],
    );
    const cl = await client.query(
      `SELECT id FROM clients WHERE phone = '0700000001' AND tenant_id = $1 LIMIT 1`,
      [tenantId],
    );
    const clientId = cl.rows[0].id;

    // Loan ACTIVE
    const loanExists = await client.query(
      `SELECT id FROM loans WHERE loan_number = 'DEMO-LOAN-001' AND tenant_id = $1`,
      [tenantId],
    );
    let loanId;
    if (loanExists.rows.length) {
      loanId = loanExists.rows[0].id;
      console.log('Loan DEMO-LOAN-001 already exists id=' + loanId);
    } else {
      const ins = await client.query(
        `
        INSERT INTO loans (
          loan_number, loan_type, client_id, principal_amount, interest_rate, total_amount,
          balance, term_months, start_date, status, tenant_id, branch_id, product_id, loan_product_id,
          total_arrears, days_in_arrears, processing_fee
        ) VALUES (
          'DEMO-LOAN-001', 'cash', $1, 1000000, 10, 1100000,
          900000, 6, CURRENT_DATE - 30, 'ACTIVE', $2, $3, $4, $4,
          50000, 15, 0
        ) RETURNING id
      `,
        [clientId, tenantId, branchId, productId],
      );
      loanId = ins.rows[0].id;
      console.log('Created loan id=' + loanId);
    }

    // Schedules: one overdue, one due today, one future
    const sch = await client.query(`SELECT COUNT(*)::int AS c FROM loan_schedules WHERE loan_id = $1`, [loanId]);
    if (sch.rows[0].c === 0) {
      await client.query(
        `
        INSERT INTO loan_schedules (loan_id, installment_number, due_date, amount_due, principal_due, interest_due, amount_paid, status, tenant_id, branch_id)
        VALUES
          ($1, 1, CURRENT_DATE - 14, 200000, 180000, 20000, 0, 'OVERDUE', $2, $3),
          ($1, 2, CURRENT_DATE,      200000, 180000, 20000, 0, 'PENDING', $2, $3),
          ($1, 3, CURRENT_DATE + 14, 200000, 180000, 20000, 0, 'PENDING', $2, $3)
      `,
        [loanId, tenantId, branchId],
      );
      console.log('Created 3 schedule rows');
    }

    // Payment today (COMPLETED)
    const pay = await client.query(
      `SELECT id FROM payments WHERE receipt_number = 'DEMO-RCPT-001' AND tenant_id = $1`,
      [tenantId],
    );
    if (!pay.rows.length) {
      await client.query(
        `
        INSERT INTO payments (
          loan_id, amount, principal_amount, interest_amount, payment_method,
          receipt_number, payment_date, status, tenant_id, branch_id, notes
        ) VALUES (
          $1, 100000, 90000, 10000, 'CASH',
          'DEMO-RCPT-001', NOW(), 'COMPLETED', $2, $3, 'Demo seed payment'
        )
      `,
        [loanId, tenantId, branchId],
      );
      console.log('Created demo payment DEMO-RCPT-001');
    }

    // Optional alert
    await client.query(
      `
      INSERT INTO loan_alerts (loan_id, alert_type, message, is_read, is_resolved, tenant_id, severity, title, amount_due, days_overdue)
      SELECT $1, 'OVERDUE', 'Demo overdue installment', false, false, $2, 'high', 'Overdue installment', 200000, 14
      WHERE NOT EXISTS (
        SELECT 1 FROM loan_alerts WHERE loan_id = $1 AND title = 'Overdue installment'
      )
    `,
      [loanId, tenantId],
    );

    await client.query('COMMIT');
    console.log('');
    console.log('Demo data ready.');
    console.log('  Client phone: 0700000001');
    console.log('  Loan: DEMO-LOAN-001 (balance 900000, 15 days in arrears)');
    console.log('  Payment: DEMO-RCPT-001 (100000 COMPLETED today)');
    console.log('Refresh dashboard and Reports.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed demo failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

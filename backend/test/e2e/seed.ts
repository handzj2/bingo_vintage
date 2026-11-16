/**
 * Seed for the work-queue end-to-end tests.
 * SAFETY: refuses to run unless the database name contains "test" — it TRUNCATES nothing, but it
 * inserts users/loans/etc. and must never be pointed at real data.
 */
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

export const PASSWORD = 'Passw0rd!';

export function assertDisposableDb(url: string | undefined) {
  if (!url) throw new Error('DATABASE_URL is required');
  const name = new URL(url).pathname.replace('/', '');
  if (!/test/i.test(name)) throw new Error(`Refusing to seed database "${name}": name must contain "test"`);
}

export type Ids = Record<string, number>;

export async function seed(db: Client): Promise<Ids> {
  const ids: Ids = {};
  const one = async (sql: string, p: any[] = []) => (await db.query(sql, p)).rows[0];
  const hash = await bcrypt.hash(PASSWORD, 4);

  // ── tenants / branches / roles ────────────────────────────────────────────
  ids.t1 = 1;
  ids.t2 = (await one(`INSERT INTO tenants (name, slug) VALUES ('Other Tenant','other-tenant') RETURNING id`)).id;
  ids.b1 = 1;
  ids.b2 = (await one(`INSERT INTO branches (tenant_id, name) VALUES (1,'Branch Two') RETURNING id`)).id;
  ids.b3 = (await one(`INSERT INTO branches (tenant_id, name) VALUES ($1,'Other Main') RETURNING id`, [ids.t2])).id;

  const roleId = async (tenant: number, name: string) =>
    (await one(`SELECT id FROM roles WHERE tenant_id=$1 AND lower(name)=$2`, [tenant, name]))?.id;
  ids.roleAdmin = await roleId(1, 'admin');
  ids.roleManager = await roleId(1, 'manager');
  ids.roleAgent = await roleId(1, 'agent');
  ids.roleCashier = await roleId(1, 'cashier');
  // branch_manager (branch-scoped) with the manager permission set
  ids.roleBranchMgr = (await one(`INSERT INTO roles (tenant_id, name) VALUES (1,'branch_manager') RETURNING id`)).id;
  await db.query(
    `INSERT INTO role_permissions (role_id, permission_code, tenant_id)
     SELECT $1, permission_code, 1 FROM role_permissions WHERE role_id = $2`, [ids.roleBranchMgr, ids.roleManager]);
  // tenant 2 admin role
  ids.roleAdmin2 = (await one(`INSERT INTO roles (tenant_id, name) VALUES ($1,'admin') RETURNING id`, [ids.t2])).id;
  await db.query(
    `INSERT INTO role_permissions (role_id, permission_code, tenant_id)
     SELECT $1, permission_code, $2 FROM role_permissions WHERE role_id = $3`, [ids.roleAdmin2, ids.t2, ids.roleAdmin]);

  // ── users ─────────────────────────────────────────────────────────────────
  const user = async (key: string, username: string, role: number, tenant: number, branch: number | null, overrides: any = null) => {
    ids[key] = (await one(
      `INSERT INTO users (username, password_hash, email, full_name, role_id, is_active, tenant_id, branch_id, permissions)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8) RETURNING id`,
      [username, hash, `${username}@e2e.test`, `User ${username}`, role, tenant, branch, overrides ? JSON.stringify(overrides) : null],
    )).id;
  };
  await user('admin', 'admin1', ids.roleAdmin, 1, null);
  await user('mgr1', 'mgr1', ids.roleManager, 1, null);
  await user('mgr2', 'mgr2', ids.roleManager, 1, null);
  await user('clerk', 'clerk1', ids.roleAgent, 1, null, { 'loan.correct_balance': true, 'loan.create': true });
  await user('cashier', 'cashier1', ids.roleCashier, 1, ids.b1);
  await user('brmgr', 'brmgr2', ids.roleBranchMgr, 1, ids.b2);               // branch-scoped, BRANCH TWO
  await user('revonly', 'revonly', ids.roleAgent, 1, null, { 'payment.reversal.approve': true }); // only the reversal queue
  await user('admin2', 'admin2', ids.roleAdmin2, ids.t2, null);

  // ── clients ───────────────────────────────────────────────────────────────
  const client = async (key: string, tenant: number, branch: number, first: string) => {
    ids[key] = (await one(
      `INSERT INTO clients (first_name,last_name,full_name,phone,tenant_id,branch_id) VALUES ($1,'Tester',$5,$2,$3,$4) RETURNING id`,
      [first, `0700${Math.floor(Math.random() * 1e6)}`, tenant, branch, `${first} Tester`])).id;
  };
  await client('c1', 1, ids.b1, 'Alice'); await client('c2', 1, ids.b2, 'Bob'); await client('c3', ids.t2, ids.b3, 'Zed');

  // ── loans ─────────────────────────────────────────────────────────────────
  let n = 0;
  const loan = async (key: string, o: { tenant: number; branch: number; client: number; status: string; balance: number; by: number; deleted?: boolean }) => {
    n++;
    ids[key] = (await one(
      `INSERT INTO loans (loan_number, loan_type, client_id, principal_amount, interest_rate, total_amount, balance, term_months,
                          start_date, status, created_by, tenant_id, branch_id, deleted_at)
       VALUES ($1,'cash',$2,100000,10,120000,$3,4,'2026-08-01',$4::loan_status_enum,$5,$6,$7,$8) RETURNING id`,
      [`E2E-${n}`, o.client, o.balance, o.status, o.by, o.tenant, o.branch, o.deleted ? new Date() : null])).id;
  };
  await loan('loanPending', { tenant: 1, branch: ids.b1, client: ids.c1, status: 'PENDING_APPROVAL', balance: 120000, by: ids.clerk });
  await loan('loanPendingDeleted', { tenant: 1, branch: ids.b1, client: ids.c1, status: 'PENDING_APPROVAL', balance: 120000, by: ids.clerk, deleted: true });
  await loan('loanActive', { tenant: 1, branch: ids.b1, client: ids.c1, status: 'ACTIVE', balance: 90000, by: ids.admin });
  await loan('loanActive2', { tenant: 1, branch: ids.b1, client: ids.c1, status: 'ACTIVE', balance: 90000, by: ids.admin });
  await loan('loanBranch2', { tenant: 1, branch: ids.b2, client: ids.c2, status: 'ACTIVE', balance: 90000, by: ids.admin });
  await loan('loanOther', { tenant: ids.t2, branch: ids.b3, client: ids.c3, status: 'ACTIVE', balance: 90000, by: ids.admin2 });
  await loan('loanOtherPending', { tenant: ids.t2, branch: ids.b3, client: ids.c3, status: 'PENDING_APPROVAL', balance: 120000, by: ids.admin2 });

  // ── schedules (4 monthly installments of 30000) for loanActive & loanActive2 ─
  for (const key of ['loanActive', 'loanActive2', 'loanBranch2', 'loanOther']) {
    const tenant = key === 'loanOther' ? ids.t2 : 1;
    for (let i = 1; i <= 4; i++) {
      const paid = i === 1 ? 30000 : 0;
      await db.query(
        `INSERT INTO loan_schedules (loan_id, installment_number, due_date, amount_due, principal_due, interest_due, amount_paid, status, tenant_id)
         VALUES ($1,$2,$3,30000,25000,5000,$4,$5::schedule_status_enum,$6)`,
        [ids[key], i, `2026-${String(8 + i).padStart(2, '0')}-01`, paid, i === 1 ? 'PAID' : 'PENDING', tenant]);
    }
  }

  // ── drawers: overdue (3 days ago) T1 B1 + T2, and an open drawer for today (not overdue) ─
  ids.drawerOverdue = (await one(
    `INSERT INTO cash_drawers (tenant_id, branch_id, user_id, opening_balance, current_balance, drawer_date, status)
     VALUES (1,$1,$2,50000,50000,(CURRENT_DATE - 3),'open') RETURNING id`, [ids.b1, ids.cashier])).id;
  ids.drawerOverdue2 = (await one(
    `INSERT INTO cash_drawers (tenant_id, branch_id, user_id, opening_balance, current_balance, drawer_date, status)
     VALUES (1,$1,$2,50000,50000,(CURRENT_DATE - 2),'open') RETURNING id`, [ids.b1, ids.cashier])).id;
  ids.drawerOther = (await one(
    `INSERT INTO cash_drawers (tenant_id, branch_id, user_id, opening_balance, current_balance, drawer_date, status)
     VALUES ($1,$2,$3,50000,50000,(CURRENT_DATE - 3),'open') RETURNING id`, [ids.t2, ids.b3, ids.admin2])).id;

  // ── expenses ──────────────────────────────────────────────────────────────
  const cat = (await one(`SELECT id FROM expense_categories ORDER BY id LIMIT 1`))?.id
    ?? (await one(`INSERT INTO expense_categories (name, tenant_id) VALUES ('General',1) RETURNING id`)).id;
  const expense = async (key: string, tenant: number, branch: number, by: number, amount: number) => {
    ids[key] = (await one(
      `INSERT INTO expenses (tenant_id, branch_id, category_id, amount, description, payment_method, status, created_by_id)
       VALUES ($1,$2,$3,$4,$5,'CASH','pending',$6) RETURNING id`, [tenant, branch, cat, amount, `E2E expense ${key}`, by])).id;
  };
  await expense('exp1', 1, ids.b1, ids.cashier, 20000);
  await expense('exp2', 1, ids.b1, ids.cashier, 30000);
  await expense('expOther', ids.t2, ids.b3, ids.admin2, 40000);

  // ── payments: reversal requests (PENDING) ────────────────────────────────
  const reversalPayment = async (key: string, loanKey: string, tenant: number, branch: number, by: number, receipt: string) => {
    ids[key] = (await one(
      `INSERT INTO payments (loan_id, amount, payment_method, receipt_number, status, created_by_id, tenant_id, branch_id,
                             reversal_status, reversal_reason, reversal_requested_by, reversal_requested_at)
       VALUES ($1,10000,'CASH',$2,'REVERSAL_REQUESTED',$3,$4,$5,'PENDING','Customer paid twice by mistake','cashier1',NOW()) RETURNING id`,
      [ids[loanKey], receipt, by, tenant, branch])).id;
  };
  await reversalPayment('rev1', 'loanActive2', 1, ids.b1, ids.cashier, 'RCT-E2E-REV1');
  await reversalPayment('rev2', 'loanActive2', 1, ids.b1, ids.cashier, 'RCT-E2E-REV2');
  await reversalPayment('revOther', 'loanOther', ids.t2, ids.b3, ids.admin2, 'RCT-E2E-REVO');

  // ── a PENDING correction in the other tenant (isolation) ─────────────────
  ids.corrOther = (await one(
    `INSERT INTO loan_corrections (tenant_id, branch_id, loan_id, correction_type, previous_snapshot, new_snapshot, reason, status, requested_by_id)
     VALUES ($1,$2,$3,'BALANCE','{"balance":90000,"totalAmount":120000,"status":"ACTIVE"}','{"balance":50000}','other tenant correction','PENDING',$4) RETURNING id`,
    [ids.t2, ids.b3, ids.loanOther, ids.admin2])).id;

  return ids;
}

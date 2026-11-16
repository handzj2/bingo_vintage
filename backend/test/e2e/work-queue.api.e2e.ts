/**
 * Work-queue API end-to-end tests — real HTTP against the built backend and a real PostgreSQL
 * database that has had ALL migrations applied. Run via test/e2e/run.sh (see README there).
 */
import * as assert from 'assert/strict';
import { Client } from 'pg';
import { seed, Ids, assertDisposableDb } from './seed';
import { startServer, tokenFor, call, connect, test, setSection, summary } from './harness';

const URL = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  assertDisposableDb(URL);
  const db: Client = await connect(URL);
  const ids: Ids = await seed(db);
  const q = async (sql: string, p: any[] = []) => (await db.query(sql, p)).rows;
  const q1 = async (sql: string, p: any[] = []) => (await db.query(sql, p)).rows[0];
  const server = await startServer(URL);
  const T = (key: string, name: string) => tokenFor(ids[key], name);
  const tok = {
    admin: T('admin', 'admin1'), mgr1: T('mgr1', 'mgr1'), mgr2: T('mgr2', 'mgr2'), clerk: T('clerk', 'clerk1'),
    cashier: T('cashier', 'cashier1'), brmgr: T('brmgr', 'brmgr2'), revonly: T('revonly', 'revonly'), admin2: T('admin2', 'admin2'),
  };
  const pw = (t: string) => call('GET', '/dashboard/pending-work', t);
  const snapshot = async (sql: string, p: any[] = []) => JSON.stringify(await q(sql, p));

  try {
    // ═════════════════════════════════════════════════════════════════════════
    setSection('P1 — original SQL error vs. live schema');
    await test('ORIGINAL query (u.id = l.created_by_id) fails on the live schema with 42703', async () => {
      await assert.rejects(
        db.query(`SELECT l.id FROM loans l LEFT JOIN users u ON u.id = l.created_by_id WHERE l.tenant_id = 1`),
        (e: any) => e.code === '42703' && /created_by_id/.test(e.message));
    });
    await test('loans table really has created_by (not created_by_id)', async () => {
      const cols = (await q(`SELECT column_name FROM information_schema.columns WHERE table_name='loans'`)).map((r) => r.column_name);
      assert.ok(cols.includes('created_by')); assert.ok(!cols.includes('created_by_id'));
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('Queue contents, permissions, tenant & branch isolation');
    await test('admin: every queue loads (no error), counts exclude soft-deleted loans and other tenants', async () => {
      const r = await pw(tok.admin); assert.equal(r.status, 200);
      const b = r.body;
      assert.equal(b.status, 'ok'); assert.deepEqual(b.failedQueues, []);
      for (const k of ['loans', 'expenses', 'reversals', 'corrections', 'overdueDrawers']) assert.equal(b[k].error, undefined, k);
      assert.equal(b.loans.count, 1); assert.equal(b.loans.items.length, 1);
      assert.equal(b.loans.items[0].id, ids.loanPending);
      assert.equal(b.loans.items[0].submittedBy, 'User clerk1', 'creator resolved through loans.created_by');
      assert.equal(b.expenses.count, 2); assert.equal(b.reversals.count, 2);
      assert.equal(b.corrections.count, 0); assert.equal(b.overdueDrawers.count, 2);
      assert.equal(b.total, 7);
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.overdueDrawers.items[0].description.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''));
    });
    await test('cashier (no approval permissions): nothing leaked', async () => {
      const b = (await pw(tok.cashier)).body;
      assert.equal(b.total, 0); for (const k of ['loans', 'expenses', 'reversals', 'corrections', 'overdueDrawers']) assert.deepEqual(b[k].items, []);
    });
    await test('manager sees loans/expenses/drawers but not the admin-only reversal queue', async () => {
      const b = (await pw(tok.mgr1)).body;
      assert.equal(b.loans.count, 1); assert.equal(b.expenses.count, 2); assert.equal(b.reversals.count, 0); assert.equal(b.overdueDrawers.count, 2);
    });
    await test('branch-scoped approver (branch two) sees nothing from branch one', async () => {
      const b = (await pw(tok.brmgr)).body;
      assert.equal(b.loans.count, 0); assert.equal(b.expenses.count, 0); assert.equal(b.overdueDrawers.count, 0);
    });
    await test('other tenant admin sees only its own items', async () => {
      const b = (await pw(tok.admin2)).body;
      assert.equal(b.loans.count, 1); assert.equal(b.loans.items[0].id, ids.loanOtherPending);
      assert.equal(b.expenses.count, 1); assert.equal(b.reversals.count, 1); assert.equal(b.corrections.count, 1); assert.equal(b.overdueDrawers.count, 1);
      assert.equal(b.status, 'ok');
    });
    await test('unauthenticated request is rejected', async () => { assert.equal((await call('GET', '/dashboard/pending-work')).status, 401); });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('P2 — failed queue is an error, never an empty queue');
    const rename = async (sql: string) => { await db.query(sql); };
    await rename(`ALTER TABLE payments RENAME COLUMN reversal_requested_at TO reversal_requested_at_x`);
    let adminRef = '';
    await test('admin: reversal queue reports missing_column diagnostic; other queues still load; total excludes failed queue', async () => {
      const r = await pw(tok.admin); assert.equal(r.status, 200);
      const b = r.body;
      assert.equal(b.status, 'degraded'); assert.deepEqual(b.failedQueues, ['reversals']);
      assert.equal(b.reversals.error.code, 'QUEUE_SCHEMA_MISMATCH');
      assert.equal(b.reversals.error.diagnostic.category, 'missing_column');
      assert.equal(b.reversals.error.diagnostic.pgCode, '42703');
      assert.match(b.reversals.error.diagnostic.detail, /reversal_requested_at/);
      assert.match(b.reversals.error.diagnostic.remedy, /migration/i);
      assert.equal(b.reversals.count, 0); assert.deepEqual(b.reversals.items, []);
      assert.equal(b.loans.count, 1); assert.equal(b.expenses.count, 2); assert.equal(b.overdueDrawers.count, 2);
      assert.equal(b.total, 7 - 2);
      adminRef = b.reversals.error.reference; assert.match(adminRef, /^PW-[0-9A-F]{8}$/);
    });
    await test('structured server log carries the same reference, queue, pg code and category', async () => {
      await sleep(200);
      const line = server.logs.find((l) => l.includes('pending_work_queue_failed') && l.includes(adminRef));
      assert.ok(line, 'no structured log line for ' + adminRef);
      const json = JSON.parse(line!.slice(line!.indexOf('{'), line!.lastIndexOf('}') + 1).replace(/\\"/g, '"'));
      assert.equal(json.queue, 'reversals'); assert.equal(json.pgCode, '42703'); assert.equal(json.category, 'missing_column'); assert.equal(json.reference, adminRef);
    });
    await db.query(`UPDATE users SET permissions = '{"payment.reversal.approve": true}' WHERE id = $1`, [ids.mgr2]);
    await test('ordinary user with a failing queue: error + reference, but no SQL / column / table / diagnostic', async () => {
      const r = await pw(tok.mgr2); assert.equal(r.status, 200);
      const e = r.body.reversals.error; assert.equal(r.body.status, 'degraded');
      assert.ok(e.reference && e.message && e.code);
      assert.equal(e.diagnostic, undefined);
      const raw = JSON.stringify(r.body);
      assert.ok(!/reversal_requested_at|SELECT|FROM payments|pg_|postgres|bingo:/i.test(raw), 'leaked DB detail: ' + raw.slice(0, 400));
      assert.match(e.message, /NOT an empty queue/);
      assert.equal(r.body.loans.count, 1);
    });
    await db.query(`UPDATE users SET permissions = NULL WHERE id = $1`, [ids.mgr2]);
    await test('when EVERY enabled queue fails the endpoint answers 503, not an empty 200', async () => {
      const r = await pw(tok.revonly);
      assert.equal(r.status, 503);
      assert.match(JSON.stringify(r.body), /not an empty queue/i); assert.match(JSON.stringify(r.body), /PW-[0-9A-F]{8}/);
      assert.ok(!/reversal_requested_at|SELECT/i.test(JSON.stringify(r.body)));
    });
    await rename(`ALTER TABLE payments RENAME COLUMN reversal_requested_at_x TO reversal_requested_at`);

    await rename(`ALTER TABLE loan_corrections RENAME TO loan_corrections_x`);
    await test('missing table (migration 032 absent) surfaces as missing_table on the corrections queue', async () => {
      const b = (await pw(tok.admin)).body;
      assert.deepEqual(b.failedQueues, ['corrections']);
      assert.equal(b.corrections.error.diagnostic.category, 'missing_table'); assert.equal(b.corrections.error.diagnostic.pgCode, '42P01');
    });
    await rename(`ALTER TABLE loan_corrections_x RENAME TO loan_corrections`);
    await rename(`ALTER TABLE cash_drawers RENAME COLUMN user_id TO user_id_x`);
    await test('missing cash_drawers column surfaces on the overdue-drawer queue', async () => {
      const b = (await pw(tok.admin)).body;
      assert.deepEqual(b.failedQueues, ['overdueDrawers']); assert.equal(b.overdueDrawers.error.diagnostic.category, 'missing_column');
    });
    await rename(`ALTER TABLE cash_drawers RENAME COLUMN user_id_x TO user_id`);
    await test('after the schema is restored every queue loads again', async () => {
      const b = (await pw(tok.admin)).body; assert.equal(b.status, 'ok'); assert.equal(b.total, 7);
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('P3 — correction approval integrity');
    const loanState = (id: number) => q1(`SELECT balance::float, status::text, notes FROM loans WHERE id=$1`, [id]);
    const corrState = (id: number) => q1(`SELECT status, approved_by_id, applied_at FROM loan_corrections WHERE id=$1`, [id]);
    const decide = (t: string, id: number, decision: string, reason?: string) => call('POST', `/loans/corrections/${id}/decide`, t, { decision, reason });
    const insertCorr = async (loan: string, type: string, prev: any, next: any, by: number, branch: number | null = ids.b1, tenant = 1) =>
      (await q1(`INSERT INTO loan_corrections (tenant_id, branch_id, loan_id, correction_type, previous_snapshot, new_snapshot, reason, status, requested_by_id)
                 VALUES ($1,$2,$3,$4,$5,$6,'e2e reason','PENDING',$7) RETURNING id`,
        [tenant, branch, ids[loan], type, JSON.stringify(prev), JSON.stringify(next), by])).id as number;

    let corrId = 0;
    await test('clerk without approval right queues a balance correction (PENDING, loan untouched)', async () => {
      const r = await call('PATCH', `/loans/${ids.loanActive}/correct-balance`, tok.clerk, { newBalance: 60000, reason: 'E2E balance fix' });
      assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.status, 'PENDING'); corrId = r.body.correctionId;
      assert.equal((await loanState(ids.loanActive)).balance, 90000); assert.equal((await corrState(corrId)).status, 'PENDING');
    });
    await test('pending correction appears in the approver queue with a deep link; cashier sees nothing', async () => {
      const b = (await pw(tok.mgr1)).body; assert.equal(b.corrections.count, 1);
      assert.equal(b.corrections.items[0].id, corrId); assert.equal(b.corrections.items[0].href, `/dashboard/loans/${ids.loanActive}#loan-corrections`);
      assert.equal((await pw(tok.cashier)).body.corrections.count, 0);
    });
    await test('unauthorised users (no loan.approve_correction) cannot decide: 403 and nothing changes', async () => {
      for (const t of [tok.clerk, tok.cashier, tok.revonly]) assert.equal((await decide(t, corrId, 'APPROVE')).status, 403);
      assert.equal((await corrState(corrId)).status, 'PENDING'); assert.equal((await loanState(ids.loanActive)).balance, 90000);
    });
    await test('self-approval and self-rejection are refused', async () => {
      const own = await insertCorr('loanActive2', 'BALANCE', { balance: 90000, totalAmount: 120000, status: 'ACTIVE' }, { balance: 10000 }, ids.mgr1);
      assert.equal((await decide(tok.mgr1, own, 'APPROVE')).status, 403);
      assert.equal((await decide(tok.mgr1, own, 'REJECT')).status, 403);
      assert.equal((await corrState(own)).status, 'PENDING'); assert.equal((await loanState(ids.loanActive2)).balance, 90000);
      assert.equal((await decide(tok.mgr2, own, 'REJECT', 'cleanup')).status, 201);
    });

    const sched = () => snapshot(`SELECT id, status::text, amount_paid::float, version, is_active FROM loan_schedules WHERE loan_id=$1 ORDER BY id`, [ids.loanActive]);
    const pays = () => snapshot(`SELECT * FROM payments WHERE loan_id=$1 ORDER BY id`, [ids.loanActive]);
    await test('authorised second user approves: balance applied, APPLIED + approver recorded, audit row + loan note written, schedule & payments untouched', async () => {
      const [s0, p0] = [await sched(), await pays()];
      const r = await decide(tok.mgr1, corrId, 'APPROVE', 'verified against receipts');
      assert.equal(r.status, 201, JSON.stringify(r.body)); assert.equal(r.body.status, 'APPLIED'); assert.equal(r.body.newBalance, 60000);
      const l = await loanState(ids.loanActive); assert.equal(l.balance, 60000); assert.equal(l.status, 'ACTIVE'); assert.match(l.notes, /CORRECTION_APPROVED/);
      const c = await corrState(corrId); assert.equal(c.status, 'APPLIED'); assert.equal(c.approved_by_id, ids.mgr1); assert.ok(c.applied_at);
      const a = await q(`SELECT * FROM audit WHERE action='LOAN_CORRECTION_APPROVED' AND record_id=$1`, [corrId]);
      assert.equal(a.length, 1); assert.equal(a[0].tenant_id, 1); assert.match(a[0].description, /90000 -> 60000|60000/);
      assert.equal(await sched(), s0); assert.equal(await pays(), p0);
    });
    await test('queue and counts refresh: item gone after approval', async () => {
      assert.equal((await pw(tok.mgr1)).body.corrections.count, 0); assert.equal((await pw(tok.admin)).body.total, 7);
    });
    await test('a second authorised user cannot approve (or reject) the same item again', async () => {
      assert.equal((await decide(tok.mgr2, corrId, 'APPROVE')).status, 400);
      assert.equal((await decide(tok.admin, corrId, 'REJECT')).status, 400);
      assert.equal((await loanState(ids.loanActive)).balance, 60000);
      assert.equal((await q(`SELECT 1 FROM audit WHERE action LIKE 'LOAN_CORRECTION_%' AND record_id=$1`, [corrId])).length, 1);
    });
    await test('simultaneous approvals by two users: exactly one wins, change applied once', async () => {
      const r0 = await call('PATCH', `/loans/${ids.loanActive2}/correct-balance`, tok.clerk, { newBalance: 70000, reason: 'E2E race' });
      const id = r0.body.correctionId;
      const [a, b] = await Promise.all([decide(tok.mgr1, id, 'APPROVE'), decide(tok.mgr2, id, 'APPROVE')]);
      assert.deepEqual([a.status, b.status].sort(), [201, 400], JSON.stringify([a.body, b.body]));
      assert.equal((await loanState(ids.loanActive2)).balance, 70000);
      assert.equal((await q(`SELECT 1 FROM audit WHERE action='LOAN_CORRECTION_APPROVED' AND record_id=$1`, [id])).length, 1);
    });
    await test('stale correction (balance moved after the request): 409, nothing applied, stays PENDING, can be rejected', async () => {
      const r0 = await call('PATCH', `/loans/${ids.loanActive}/correct-balance`, tok.clerk, { newBalance: 50000, reason: 'E2E stale' });
      const id = r0.body.correctionId;
      await db.query(`UPDATE loans SET balance = 55000 WHERE id=$1`, [ids.loanActive]);   // a payment lands meanwhile
      const r = await decide(tok.mgr1, id, 'APPROVE'); assert.equal(r.status, 409); assert.match(r.body.message, /changed since/);
      assert.equal((await loanState(ids.loanActive)).balance, 55000); assert.equal((await corrState(id)).status, 'PENDING');
      assert.equal((await decide(tok.mgr1, id, 'REJECT', 'stale')).status, 201);
      const c = await corrState(id); assert.equal(c.status, 'REJECTED'); assert.equal(c.approved_by_id, ids.mgr1);
      assert.equal((await q(`SELECT 1 FROM audit WHERE action='LOAN_CORRECTION_REJECTED' AND record_id=$1`, [id])).length, 1);
      await db.query(`UPDATE loans SET balance = 60000 WHERE id=$1`, [ids.loanActive]);
    });
    await test('UNSUPPORTED type (TERMS) cannot be approved: 422, NOT marked APPLIED, loan untouched; reject still works', async () => {
      const id = await insertCorr('loanActive', 'TERMS', { balance: 60000 }, { principalAmount: 50000 }, ids.clerk);
      const before = await loanState(ids.loanActive);
      const r = await decide(tok.mgr1, id, 'APPROVE'); assert.equal(r.status, 422); assert.match(r.body.message, /cannot be approved from the queue/);
      assert.equal((await corrState(id)).status, 'PENDING'); assert.deepEqual(await loanState(ids.loanActive), before);
      assert.equal((await decide(tok.mgr1, id, 'REJECT')).status, 201); assert.equal((await corrState(id)).status, 'REJECTED');
    });
    await test('BALANCE correction with no/invalid requested balance: 422, NOT marked APPLIED', async () => {
      for (const snap of [{}, { balance: -5 }, { balance: 'abc' }]) {
        const id = await insertCorr('loanActive', 'BALANCE', { balance: 60000 }, snap, ids.clerk);
        const r = await decide(tok.mgr1, id, 'APPROVE'); assert.equal(r.status, 422, JSON.stringify(snap));
        assert.equal((await corrState(id)).status, 'PENDING'); await decide(tok.mgr1, id, 'REJECT');
      }
      assert.equal((await loanState(ids.loanActive)).balance, 60000);
    });
    await test('loan no longer in an eligible state (CANCELLED) => 400 and nothing applied', async () => {
      const id = await insertCorr('loanActive2', 'BALANCE', { balance: 70000, status: 'ACTIVE' }, { balance: 1000 }, ids.clerk);
      await db.query(`UPDATE loans SET status='CANCELLED' WHERE id=$1`, [ids.loanActive2]);
      const r = await decide(tok.mgr1, id, 'APPROVE'); assert.ok([400, 409].includes(r.status), String(r.status));
      assert.equal((await corrState(id)).status, 'PENDING'); await db.query(`UPDATE loans SET status='ACTIVE' WHERE id=$1`, [ids.loanActive2]);
      await decide(tok.mgr1, id, 'REJECT');
    });
    await test('tenant isolation: other tenant cannot decide ours; we cannot decide theirs; correction history is tenant-scoped', async () => {
      const mine = await insertCorr('loanActive', 'BALANCE', { balance: 60000, totalAmount: 120000, status: 'ACTIVE' }, { balance: 40000 }, ids.clerk);
      assert.equal((await decide(tok.admin2, mine, 'APPROVE')).status, 403);
      assert.equal((await decide(tok.admin, ids.corrOther, 'APPROVE')).status, 403);
      assert.equal((await corrState(mine)).status, 'PENDING'); assert.equal((await corrState(ids.corrOther)).status, 'PENDING');
      assert.equal((await loanState(ids.loanActive)).balance, 60000);
      const leak = await call('GET', `/loans/${ids.loanActive}/correction-history`, tok.admin2);
      assert.equal(leak.status, 200); assert.deepEqual(leak.body.corrections, [], 'other tenant must not read our correction history');
      assert.ok((await call('GET', `/loans/${ids.loanActive}/correction-history`, tok.admin)).body.corrections.length > 0);
      await decide(tok.mgr1, mine, 'REJECT');
    });
    await test('branch scope: branch-two approver cannot decide a branch-one correction, but can decide its own branch', async () => {
      const other = await insertCorr('loanActive', 'BALANCE', { balance: 60000, totalAmount: 120000, status: 'ACTIVE' }, { balance: 41000 }, ids.clerk, ids.b1);
      assert.equal((await decide(tok.brmgr, other, 'APPROVE')).status, 403); assert.equal((await corrState(other)).status, 'PENDING');
      await decide(tok.mgr1, other, 'REJECT');
      const own = await insertCorr('loanBranch2', 'BALANCE', { balance: 90000, totalAmount: 120000, status: 'ACTIVE' }, { balance: 80000 }, ids.clerk, ids.b2);
      const r = await decide(tok.brmgr, own, 'APPROVE'); assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal((await loanState(ids.loanBranch2)).balance, 80000);
    });
    await test('ONE transaction: a failure writing the audit row rolls back the balance change and leaves the correction PENDING', async () => {
      const id = await insertCorr('loanActive', 'BALANCE', { balance: 60000, totalAmount: 120000, status: 'ACTIVE' }, { balance: 33000 }, ids.clerk);
      await db.query(`CREATE OR REPLACE FUNCTION e2e_fail_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'e2e forced audit failure'; END $$ LANGUAGE plpgsql`);
      await db.query(`CREATE TRIGGER e2e_fail BEFORE INSERT ON audit FOR EACH ROW WHEN (NEW.action = 'LOAN_CORRECTION_APPROVED') EXECUTE FUNCTION e2e_fail_audit()`);
      const notesBefore = (await loanState(ids.loanActive)).notes;
      const r = await decide(tok.mgr1, id, 'APPROVE'); assert.equal(r.status, 500);
      assert.equal((await loanState(ids.loanActive)).balance, 60000, 'balance must be rolled back');
      assert.equal((await loanState(ids.loanActive)).notes, notesBefore); assert.equal((await corrState(id)).status, 'PENDING');
      await db.query(`DROP TRIGGER e2e_fail ON audit`);
      assert.equal((await decide(tok.mgr1, id, 'APPROVE')).status, 201); assert.equal((await loanState(ids.loanActive)).balance, 33000);
      await db.query(`UPDATE loans SET balance = 60000 WHERE id=$1`, [ids.loanActive]);
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('P4 — restructure preserves payments and allocation history');
    // Real history on loanActive: 2 live payments + 1 reversed payment, with allocations on schedule v1.
    const s1 = await q(`SELECT id, installment_number FROM loan_schedules WHERE loan_id=$1 ORDER BY installment_number`, [ids.loanActive]);
    const mkPay = async (amount: number, receipt: string, status: string, date: string) => (await q1(
      `INSERT INTO payments (loan_id, amount, payment_method, receipt_number, payment_date, status, created_by_id, cash_drawer_id, tenant_id, branch_id,
                             reversed_at, reversal_reason, reversed_by)
       VALUES ($1,$2,'CASH',$3,$4,$5,$6,$7,1,$8,$9,$10,$11) RETURNING id`,
      [ids.loanActive, amount, receipt, date, status, ids.cashier, ids.drawerOverdue, ids.b1,
       status === 'REVERSED' ? new Date() : null, status === 'REVERSED' ? 'entered twice' : null, status === 'REVERSED' ? 'admin1' : null])).id as number;
    const pA = await mkPay(30000, 'RCT-E2E-A', 'COMPLETED', '2026-08-05 10:00');
    const pB = await mkPay(5000, 'RCT-E2E-B', 'COMPLETED', '2026-09-05 10:00');
    const pR = await mkPay(7000, 'RCT-E2E-R', 'REVERSED', '2026-09-06 10:00');
    const alloc = (p: number, s: number, amt: number, prev: string, next: string, rev = false) => db.query(
      `INSERT INTO payment_allocations (payment_id, schedule_id, amount_applied, instalment_applied, penalty_applied, previous_status, new_status, reversed_at)
       VALUES ($1,$2,$3,$3,0,$4::schedule_status_enum,$5::schedule_status_enum,$6)`, [p, s, amt, prev, next, rev ? new Date() : null]);
    await alloc(pA, s1[0].id, 30000, 'PENDING', 'PAID'); await alloc(pB, s1[1].id, 5000, 'PENDING', 'PARTIAL'); await alloc(pR, s1[1].id, 7000, 'PENDING', 'PARTIAL', true);
    await db.query(`UPDATE loan_schedules SET amount_paid=5000, status='PARTIAL' WHERE id=$1`, [s1[1].id]);

    await test('ORIGINAL reallocation insert (no previous_status/new_status) violates NOT NULL on payment_allocations — the old code could not have worked with payments', async () => {
      await db.query('BEGIN');
      try {
        await assert.rejects(db.query(`INSERT INTO payment_allocations (payment_id, schedule_id, amount_applied, instalment_applied, penalty_applied, schedule_version, created_at) VALUES ($1,$2,1,1,0,2,NOW())`, [pA, s1[0].id]),
          (e: any) => e.code === '23502');
      } finally { await db.query('ROLLBACK'); }
    });

    const payBefore = await snapshot(`SELECT * FROM payments WHERE loan_id=$1 ORDER BY id`, [ids.loanActive]);
    const allocBefore = await snapshot(`SELECT * FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE loan_id=$1) ORDER BY id`, [ids.loanActive]);
    const v1Before = await snapshot(`SELECT id, installment_number, due_date::text, amount_due::float, amount_paid::float, status::text FROM loan_schedules WHERE loan_id=$1 AND version=1 ORDER BY id`, [ids.loanActive]);
    const oldIds = (await q(`SELECT id FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE loan_id=$1) ORDER BY id`, [ids.loanActive])).map((r) => r.id);
    let rs: any;
    await test('reschedule a loan that HAS payments succeeds (200) and reports what it superseded/created', async () => {
      rs = await call('PATCH', `/loans/${ids.loanActive}/reschedule`, tok.mgr1, { startDate: '2026-09-01', reason: 'E2E start date correction' });
      assert.equal(rs.status, 200, JSON.stringify(rs.body));
      assert.equal(rs.body.scheduleVersion, 2); assert.equal(rs.body.paymentsPreserved, 2);
      assert.equal(rs.body.allocationsSuperseded, 3); assert.equal(rs.body.allocationsCreated, 2);
    });
    await test('payments are byte-for-byte unchanged (ids, receipts, dates, drawer links, reversal fields)', async () => {
      assert.equal(await snapshot(`SELECT * FROM payments WHERE loan_id=$1 ORDER BY id`, [ids.loanActive]), payBefore);
    });
    await test('every ORIGINAL allocation row still exists, unchanged (incl. the reversed one)', async () => {
      const after = await snapshot(`SELECT * FROM payment_allocations WHERE id = ANY($1) ORDER BY id`, [oldIds]);
      assert.equal(after, JSON.stringify(JSON.parse(allocBefore)));
      assert.equal((await q(`SELECT 1 FROM payment_allocations WHERE id = ANY($1) AND reversed_at IS NOT NULL`, [oldIds])).length, 1);
    });
    await test('old schedule version is superseded (not deleted) with its paid history intact', async () => {
      const v1 = await snapshot(`SELECT id, installment_number, due_date::text, amount_due::float, amount_paid::float, status::text FROM loan_schedules WHERE loan_id=$1 AND version=1 ORDER BY id`, [ids.loanActive]);
      assert.equal(v1, v1Before);
      const m = await q(`SELECT DISTINCT is_active, superseded_by_version, (superseded_at IS NOT NULL) AS stamped FROM loan_schedules WHERE loan_id=$1 AND version=1`, [ids.loanActive]);
      assert.deepEqual(m, [{ is_active: false, superseded_by_version: 2, stamped: true }]);
    });
    await test('new allocations are additive, tied to original payments + new schedule rows, with real running status transitions and version stamp', async () => {
      const n = await q(`SELECT pa.*, ls.version FROM payment_allocations pa JOIN loan_schedules ls ON ls.id = pa.schedule_id WHERE pa.id <> ALL($1) AND pa.payment_id IN (SELECT id FROM payments WHERE loan_id=$2) ORDER BY pa.id`, [oldIds, ids.loanActive]);
      assert.equal(n.length, 2);
      const due1 = Number((await q1(`SELECT amount_due FROM loan_schedules WHERE loan_id=$1 AND is_active AND installment_number=1`, [ids.loanActive])).amount_due);
      assert.ok(due1 > 35000, 'recalculated installment ' + due1);
      assert.deepEqual(n.map((r) => [r.payment_id, Number(r.amount_applied), r.previous_status, r.new_status, r.schedule_version, r.version]),
        [[pA, 30000, 'PENDING', 'PARTIAL', 2, 2], [pB, 5000, 'PARTIAL', 'PARTIAL', 2, 2]]);
      assert.ok(!n.some((r) => r.payment_id === pR), 'reversed payment must not be re-allocated');
    });
    await test('active schedule v2 reflects the payments; loan balance recomputed; correction record has superseded/created ids', async () => {
      const act = await q(`SELECT installment_number, status::text, amount_paid::float FROM loan_schedules WHERE loan_id=$1 AND is_active ORDER BY installment_number`, [ids.loanActive]);
      assert.equal(act.length, 4); assert.deepEqual(act[0], { installment_number: 1, status: 'PARTIAL', amount_paid: 35000 }); assert.equal(act[1].amount_paid, 0);
      assert.equal((await loanState(ids.loanActive)).balance, rs.body.balance); assert.equal(rs.body.balance, rs.body.totalAmount - 35000);
      const c = await q1(`SELECT status, schedule_version, new_snapshot FROM loan_corrections WHERE loan_id=$1 AND correction_type='RESCHEDULE' ORDER BY id DESC LIMIT 1`, [ids.loanActive]);
      assert.equal(c.status, 'APPLIED'); assert.equal(c.schedule_version, 2);
      assert.deepEqual([...c.new_snapshot.supersededAllocationIds].sort(), [...oldIds].sort()); assert.equal(c.new_snapshot.newAllocationIds.length, 2);
    });
    await test('current-allocation readers ignore superseded history (payment A shows only its live allocation)', async () => {
      const cur = await q(`SELECT a.id FROM payment_allocations a LEFT JOIN loan_schedules s ON s.id=a.schedule_id WHERE a.payment_id=$1 AND COALESCE(s.is_active,true)`, [pA]);
      assert.equal(cur.length, 1);
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('Expenses');
    const expState = (id: number) => q1(`SELECT status, approved_by_id FROM expenses WHERE id=$1`, [id]);
    await test('cashier cannot approve (403); other tenant cannot see/approve our expense', async () => {
      assert.equal((await call('PATCH', `/expenses/${ids.exp1}/approve`, tok.cashier)).status, 403);
      const r = await call('PATCH', `/expenses/${ids.exp1}/approve`, tok.admin2); assert.ok([403, 404].includes(r.status), String(r.status));
      assert.equal((await expState(ids.exp1)).status, 'pending');
    });
    await test('authorised user approves: status changes, queue count drops', async () => {
      const r = await call('PATCH', `/expenses/${ids.exp1}/approve`, tok.mgr1); assert.equal(r.status, 200, JSON.stringify(r.body));
      const s = await expState(ids.exp1); assert.equal(s.status, 'approved'); assert.equal(s.approved_by_id, ids.mgr1);
      assert.equal((await pw(tok.admin)).body.expenses.count, 1);
    });
    await test('another authorised user cannot approve/reject the same expense again', async () => {
      const a = await call('PATCH', `/expenses/${ids.exp1}/approve`, tok.mgr2); const b = await call('PATCH', `/expenses/${ids.exp1}/reject`, tok.mgr2);
      assert.ok(a.status >= 400 && b.status >= 400, JSON.stringify([a, b]));
      const s = await expState(ids.exp1); assert.equal(s.status, 'approved'); assert.equal(s.approved_by_id, ids.mgr1);
    });
    await test('reject path: status rejected, queue empties; other tenant item untouched', async () => {
      assert.equal((await call('PATCH', `/expenses/${ids.exp2}/reject`, tok.mgr2)).status, 200);
      assert.equal((await expState(ids.exp2)).status, 'rejected'); assert.equal((await pw(tok.admin)).body.expenses.count, 0);
      assert.equal((await expState(ids.expOther)).status, 'pending'); assert.equal((await pw(tok.admin2)).body.expenses.count, 1);
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('Payment reversals');
    const payState = (id: number) => q1(`SELECT status, reversal_status::text AS rs, reversal_decided_by FROM payments WHERE id=$1`, [id]);
    await test('cashier and non-reversal manager cannot approve (403)', async () => {
      assert.equal((await call('POST', `/payments/${ids.rev1}/approve-reversal`, tok.cashier)).status, 403);
      assert.equal((await call('POST', `/payments/${ids.rev1}/approve-reversal`, tok.mgr1)).status, 403);
      assert.equal((await payState(ids.rev1)).rs, 'PENDING');
    });
    await test('other tenant cannot decide our reversal', async () => {
      const r = await call('POST', `/payments/${ids.rev1}/approve-reversal`, tok.admin2); assert.ok([403, 404, 409].includes(r.status), String(r.status));
      assert.equal((await payState(ids.rev1)).rs, 'PENDING');
    });
    await test('admin rejects one request: status restored, reason recorded; second rejection is a conflict', async () => {
      const r = await call('POST', `/payments/${ids.rev2}/reject-reversal`, tok.admin, { reason: 'Receipt verified, payment is valid' });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const s = await payState(ids.rev2); assert.equal(s.status, 'COMPLETED'); assert.equal(s.rs, 'REJECTED');
      assert.equal((await call('POST', `/payments/${ids.rev2}/reject-reversal`, tok.admin, { reason: 'again again' })).status, 409);
      assert.equal((await pw(tok.admin)).body.reversals.count, 1);
    });
    await test('admin approves the other: payment REVERSED; a second approval is refused', async () => {
      const r = await call('POST', `/payments/${ids.rev1}/approve-reversal`, tok.admin);
      assert.equal(r.status, 201, JSON.stringify(r.body)); const s = await payState(ids.rev1); assert.equal(s.status, 'REVERSED');
      const again = await call('POST', `/payments/${ids.rev1}/approve-reversal`, tok.admin); assert.ok(again.status >= 400, String(again.status));
      assert.equal((await pw(tok.admin)).body.reversals.count, 0); assert.equal((await pw(tok.admin2)).body.reversals.count, 1);
    });

    // ═════════════════════════════════════════════════════════════════════════
    setSection('Overdue drawers');
    const drState = (id: number) => q1(`SELECT status FROM cash_drawers WHERE id=$1`, [id]);
    await test('cashier cannot force-close (403); other tenant cannot touch our drawer', async () => {
      assert.equal((await call('POST', `/cash-drawers/force-close/${ids.drawerOverdue}`, tok.cashier, { actualCash: 50000, forceClose: true, forceReason: 'e2e force close' })).status, 403);
      const r = await call('POST', `/cash-drawers/force-close/${ids.drawerOverdue}`, tok.admin2, { actualCash: 50000, forceClose: true, forceReason: 'e2e force close' }); assert.ok(r.status >= 400, String(r.status));
      assert.equal((await drState(ids.drawerOverdue)).status, 'open');
    });
    await test('authorised user force-closes: drawer closed, queue count drops, the other drawer untouched', async () => {
      const r = await call('POST', `/cash-drawers/force-close/${ids.drawerOverdue}`, tok.mgr1, { actualCash: 50000, forceClose: true, forceReason: 'Cashier left without closing' });
      assert.ok([200, 201].includes(r.status), JSON.stringify(r.body));
      assert.equal((await drState(ids.drawerOverdue)).status, 'closed'); assert.equal((await drState(ids.drawerOverdue2)).status, 'open'); assert.equal((await drState(ids.drawerOther)).status, 'open');
      assert.equal((await pw(tok.admin)).body.overdueDrawers.count, 1);
    });
    await test('another authorised user cannot force-close the same drawer again', async () => {
      const r = await call('POST', `/cash-drawers/force-close/${ids.drawerOverdue}`, tok.mgr2, { actualCash: 50000, forceClose: true, forceReason: 'second attempt' });
      assert.ok(r.status >= 400, JSON.stringify(r.body));
    });
  } finally {
    const diag = server.logs.filter((l) => l.includes('"pgCode"') && !l.includes('pending_work_queue_failed'));
    if (diag.length) console.log('\n## server-side DB diagnostics for 5xx responses\n' + diag.map((l) => '  ' + l.replace(/\u001b\[[0-9;]*m/g, '').slice(0, 400)).join('\n'));
    await server.stop(); await db.end();
  }
  process.exit(summary(process.env.E2E_RESULTS || '/tmp/e2e-api-results.json') ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });

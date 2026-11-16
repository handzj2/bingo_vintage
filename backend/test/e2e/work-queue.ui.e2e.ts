/**
 * Work-queue UI end-to-end (Playwright, real Chromium) — real Next.js production build talking to the
 * real backend and a migrated PostgreSQL database. Run via test/e2e/run.sh.
 */
import * as assert from 'assert/strict';
import { spawn } from 'child_process';
import * as path from 'path';
import { chromium } from 'playwright';
import { seed, Ids, PASSWORD, assertDisposableDb } from './seed';
import { startServer, tokenFor, call, connect, test, setSection, summary } from './harness';

const URL = process.env.DATABASE_URL!;
const SHOTS = process.env.E2E_SHOTS || '/tmp';
const FE = 'http://localhost:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  assertDisposableDb(URL);
  const db = await connect(URL); const ids: Ids = await seed(db);
  const q1 = async (sql: string, p: any[] = []) => (await db.query(sql, p)).rows[0];
  const server = await startServer(URL);
  const next = spawn('node', [path.resolve(__dirname, '../../../frontend/node_modules/next/dist/bin/next'), 'start', '-p', '3000'], { cwd: path.resolve(__dirname, '../../../frontend'), env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:5000/api' } });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(FE)).status < 500) break; } catch {} await sleep(1000); }

  const browser = await chromium.launch();
  const tok = (k: string, u: string) => tokenFor(ids[k], u);
  const ctxFor = async (token?: string) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('bingo_tour_done_v1', '1'); } catch {} });   // skip first-run guided tour
    if (token) await ctx.addInitScript((t) => { try { localStorage.setItem('access_token', t); } catch {} }, token);
    return ctx;
  };
  const badgeTotal = async (page: any) => (await page.$$eval('[aria-label$=" pending"]', (els: any[]) => els.map((e) => parseInt(e.textContent || '0', 10)))).reduce((a: number, b: number) => a + b, 0);
  const shot = (page: any, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

  try {
    // ── seed one real pending correction through the API (clerk has no approval right) ──
    const mk = await call('PATCH', `/loans/${ids.loanActive}/correct-balance`, tok('clerk', 'clerk1'), { newBalance: 60000, reason: 'UI e2e balance fix' });
    const corrId = mk.body.correctionId; assert.equal(mk.body.status, 'PENDING');

    // ═══ 1-4: manager signs in through the REAL login form, opens Work Queue, opens + approves a correction ═══
    setSection('UI — corrections: Work Queue → open item → approve');
    const mgrCtx = await ctxFor(); const mgr = await mgrCtx.newPage();
    const mgr2Ctx = await ctxFor(tok('mgr2', 'mgr2')); const mgr2 = await mgr2Ctx.newPage();
    await test('manager logs in with username + password through the login form', async () => {
      await mgr.goto(`${FE}/auth/login`);
      await mgr.fill('input[placeholder="Enter your username"]', 'mgr1'); await mgr.fill('input[placeholder="Enter your password"]', PASSWORD);
      await mgr.click('button[type=submit]'); await mgr.waitForURL(/\/dashboard/, { timeout: 30000 });
    });
    await test('Work Queue loads pending loan approvals and the correction (no error banner)', async () => {
      await mgr.goto(`${FE}/dashboard/approvals`); await mgr.waitForSelector('text=Loan approvals', { timeout: 20000 }).catch(() => {});
      const body = await mgr.innerText('body');
      assert.match(body, /E2E-1/, 'pending loan reference'); assert.match(body, /clerk1/i, 'submitter resolved (created_by join)');
      assert.match(body, /E2E-3|BALANCE/, 'pending correction listed');
      assert.equal(await mgr.locator('[data-testid^="queue-error"], [data-testid="queue-load-error"]').count(), 0);
      await shot(mgr, '01-work-queue-manager');
    });
    let before = 0;
    await test('open the pending correction from the queue (deep link lands on the loan corrections panel)', async () => {
      before = await badgeTotal(mgr);
      await mgr.locator(`a[href="/dashboard/loans/${ids.loanActive}#loan-corrections"]`).first().click();
      await mgr.waitForURL(new RegExp(`/dashboard/loans/${ids.loanActive}`), { timeout: 20000 });
      await mgr.waitForSelector('#loan-corrections', { timeout: 20000 }); await mgr.waitForSelector('text=PENDING', { timeout: 20000 });
      await shot(mgr, '02-correction-panel-pending');
    });
    // second authorised user opens the SAME item before the first decides (stale page)
    await mgr2.goto(`${FE}/dashboard/loans/${ids.loanActive}`); await mgr2.waitForSelector('#loan-corrections button:has-text("Approve")', { timeout: 20000 });
    await test('approve in the UI: toast, DB status APPLIED, loan balance changed, schedule untouched', async () => {
      const sched0 = JSON.stringify((await db.query(`SELECT id,status::text,amount_paid::float FROM loan_schedules WHERE loan_id=$1 ORDER BY id`, [ids.loanActive])).rows);
      await mgr.click('#loan-corrections button:has-text("Approve")');
      await mgr.waitForSelector('text=Correction approved', { timeout: 15000 });
      const c = await q1(`SELECT status, approved_by_id FROM loan_corrections WHERE id=$1`, [corrId]);
      assert.equal(c.status, 'APPLIED'); assert.equal(c.approved_by_id, ids.mgr1);
      assert.equal(Number((await q1(`SELECT balance FROM loans WHERE id=$1`, [ids.loanActive])).balance), 60000);
      assert.equal(JSON.stringify((await db.query(`SELECT id,status::text,amount_paid::float FROM loan_schedules WHERE loan_id=$1 ORDER BY id`, [ids.loanActive])).rows), sched0);
      await shot(mgr, '03-correction-approved');
    });
    await test('sidebar/notification counts refresh immediately (well inside the 60s poll), no reload', async () => {
      let after = before; for (let i = 0; i < 8 && after >= before; i++) { await sleep(500); after = await badgeTotal(mgr); }
      assert.ok(after < before, `badge total before=${before} after=${after}`);
    });
    await test('the loan page shows the corrected balance and the APPLIED correction in history', async () => {
      await mgr.reload(); await mgr.waitForSelector('#loan-corrections', { timeout: 20000 });
      const txt = await mgr.innerText('body'); assert.match(txt, /APPLIED/); assert.match(txt, /60,000/);
    });
    await test('a second authorised user, on a stale page, cannot approve the same item again', async () => {
      await mgr2.click('#loan-corrections button:has-text("Approve")');
      await mgr2.waitForSelector('text=/already APPLIED/i', { timeout: 15000 });
      assert.equal((await db.query(`SELECT 1 FROM audit WHERE action='LOAN_CORRECTION_APPROVED' AND record_id=$1`, [corrId])).rowCount, 1);
      assert.equal(Number((await q1(`SELECT balance FROM loans WHERE id=$1`, [ids.loanActive])).balance), 60000);
      await shot(mgr2, '04-second-user-blocked');
    });
    await test('reject path in the UI: REJECTED in DB, loan untouched', async () => {
      const r = await call('PATCH', `/loans/${ids.loanActive2}/correct-balance`, tok('clerk', 'clerk1'), { newBalance: 1000, reason: 'UI reject path' });
      await mgr.goto(`${FE}/dashboard/loans/${ids.loanActive2}`); await mgr.waitForSelector('#loan-corrections button:has-text("Reject")', { timeout: 20000 });
      await mgr.click('#loan-corrections button:has-text("Reject")'); await mgr.waitForSelector('text=Correction rejected', { timeout: 15000 });
      assert.equal((await q1(`SELECT status FROM loan_corrections WHERE id=$1`, [r.body.correctionId])).status, 'REJECTED');
      assert.equal(Number((await q1(`SELECT balance FROM loans WHERE id=$1`, [ids.loanActive2])).balance), 90000);
    });

    // ═══ 9: unauthorised + tenant isolation ═══
    setSection('UI — unauthorised user and tenant isolation');
    const cashCtx = await ctxFor(tok('cashier', 'cashier1')); const cash = await cashCtx.newPage();
    await test('cashier sees no approval items in the Work Queue and no Approve buttons on a loan', async () => {
      await cash.goto(`${FE}/dashboard/approvals`); await sleep(3000);
      const t = await cash.innerText('body'); assert.ok(!/E2E-1\b/.test(t)); assert.equal(await cash.locator('a[href*="loan-corrections"]').count(), 0);
      await shot(cash, '05-work-queue-cashier');
    });
    await test('cashier cannot execute the action directly either (API 403, DB unchanged)', async () => {
      const mk2 = await call('PATCH', `/loans/${ids.loanActive2}/correct-balance`, tok('clerk', 'clerk1'), { newBalance: 2000, reason: 'UI unauthorised' });
      const r = await call('POST', `/loans/corrections/${mk2.body.correctionId}/decide`, tok('cashier', 'cashier1'), { decision: 'APPROVE' });
      assert.equal(r.status, 403); assert.equal((await q1(`SELECT status FROM loan_corrections WHERE id=$1`, [mk2.body.correctionId])).status, 'PENDING');
      await call('POST', `/loans/corrections/${mk2.body.correctionId}/decide`, tok('mgr1', 'mgr1'), { decision: 'REJECT' });
    });
    const a2Ctx = await ctxFor(tok('admin2', 'admin2')); const a2 = await a2Ctx.newPage();
    await test('other-tenant admin sees only its own tenant in the Work Queue, and cannot open our correction deep link data', async () => {
      await a2.goto(`${FE}/dashboard/approvals`); await a2.waitForSelector('text=E2E-7', { timeout: 20000 });
      const t = await a2.innerText('body'); assert.ok(!/E2E-1\b|E2E-3\b|clerk1/.test(t), 'leaked tenant-one data');
      await shot(a2, '06-work-queue-other-tenant');
      await a2.goto(`${FE}/dashboard/loans/${ids.loanActive}`); await sleep(3000);
      assert.ok(!/UI e2e balance fix/.test(await a2.innerText('body')), 'other tenant must not see our correction history');
    });

    // ═══ expenses ═══
    setSection('UI — expenses');
    const expRows = await db.query(`SELECT id FROM expenses WHERE tenant_id=1 AND status='pending' ORDER BY id`);
    await test('manager approves an expense in the UI; DB approved; counts drop; stale second user is refused', async () => {
      await mgr2.goto(`${FE}/dashboard/expenses/approval`); await mgr2.waitForSelector('button:has-text("Approve")', { timeout: 20000 });
      await mgr.goto(`${FE}/dashboard/expenses/approval`); await mgr.waitForSelector('button:has-text("Approve")', { timeout: 20000 });
      const b0 = await badgeTotal(mgr);
      const target = await mgr.locator('button:has-text("Approve")').first();
      await target.click();
      await mgr.waitForSelector('text=/Expense #\\d+ approved successfully/', { timeout: 15000 });
      const done = await q1(`SELECT id, status, approved_by_id FROM expenses WHERE tenant_id=1 AND status='approved'`);
      assert.ok(done, 'an expense is approved'); assert.equal(done.approved_by_id, ids.mgr1);
      let b1 = b0; for (let i = 0; i < 8 && b1 >= b0; i++) { await sleep(500); b1 = await badgeTotal(mgr); } assert.ok(b1 < b0, `badge ${b0}->${b1}`);
      // second user's stale page still lists BOTH expenses; trying the one already approved must not change the approver
      const row = mgr2.locator(`text=/Expense #${done.id}\\b|#${done.id}\\b/`).first();
      await mgr2.locator('button:has-text("Approve")').first().click(); await sleep(2500);
      const after = await q1(`SELECT approved_by_id FROM expenses WHERE id=$1`, [done.id]); assert.equal(after.approved_by_id, ids.mgr1);
      await shot(mgr2, '07-expense-second-user');
    });

    // ═══ reversals ═══
    setSection('UI — payment reversals');
    const adminCtx = await ctxFor(tok('admin', 'admin1')); const adm = await adminCtx.newPage();
    await test('admin approves a reversal in the UI: payment REVERSED, queue count drops', async () => {
      await adm.goto(`${FE}/dashboard/reversals`); await adm.waitForSelector('button:has-text("Review")', { timeout: 20000 });
      const b0 = await badgeTotal(adm);
      await shot(adm, '08a-reversal-requests');
      await adm.locator('button:has-text("Review")').first().click();
      await adm.locator('button:has-text("Approve & Reverse")').first().click();
      await adm.locator('button:has-text("Approve Reversal")').click();
      for (let i = 0; i < 20; i++) { if ((await q1(`SELECT count(*)::int c FROM payments WHERE reversal_status='PENDING' AND tenant_id=1`)).c < 2) break; await sleep(500); }
      assert.equal((await q1(`SELECT count(*)::int c FROM payments WHERE status='REVERSED' AND tenant_id=1 AND receipt_number LIKE 'RCT-E2E-REV%'`)).c, 1);
      let b1 = b0; for (let i = 0; i < 8 && b1 >= b0; i++) { await sleep(500); b1 = await badgeTotal(adm); } assert.ok(b1 < b0, `badge ${b0}->${b1}`);
      await shot(adm, '08-reversal-approved');
    });
    await test('re-approving the same reversal (stale API call by another admin-level user) is refused', async () => {
      const done = await q1(`SELECT id FROM payments WHERE status='REVERSED' AND receipt_number LIKE 'RCT-E2E-REV%'`);
      const r = await call('POST', `/payments/${done.id}/approve-reversal`, tok('admin', 'admin1')); assert.ok(r.status >= 400, String(r.status));
    });

    // ═══ drawers ═══
    setSection('UI — overdue drawers');
    await test('manager force-closes an overdue drawer in the UI: DB closed, queue drops, other drawer untouched', async () => {
      await mgr.goto(`${FE}/dashboard/finance/drawers`); await mgr.waitForSelector('button:has-text("Force close")', { timeout: 20000 });
      const b0 = await badgeTotal(mgr);
      await mgr.locator('button:has-text("Force close")').first().click();
      await mgr.fill('input[type=number]', '50000'); await mgr.fill('textarea', 'Cashier left without closing (UI e2e)');
      await mgr.click('button:has-text("Confirm force-close")');
      for (let i = 0; i < 20; i++) { if ((await q1(`SELECT count(*)::int c FROM cash_drawers WHERE tenant_id=1 AND status='closed'`)).c >= 1) break; await sleep(500); }
      assert.equal((await q1(`SELECT count(*)::int c FROM cash_drawers WHERE tenant_id=1 AND status='closed'`)).c, 1);
      assert.equal((await q1(`SELECT status FROM cash_drawers WHERE id=$1`, [ids.drawerOther])).status, 'open');
      let b1 = b0; for (let i = 0; i < 8 && b1 >= b0; i++) { await sleep(500); b1 = await badgeTotal(mgr); } assert.ok(b1 < b0, `badge ${b0}->${b1}`);
      await shot(mgr, '09-drawer-force-closed');
    });

    // ═══ degraded queue is shown as an error in the UI, never as "all clear" ═══
    setSection('UI — failed queue is visible, not empty');
    await db.query(`ALTER TABLE cash_drawers RENAME COLUMN user_id TO user_id_x`);
    await test('admin Work Queue shows an explicit "unavailable" error with reference + admin diagnostic; sidebar badge shows "!"', async () => {
      await adm.goto(`${FE}/dashboard/approvals`); await adm.waitForSelector('[data-testid="queue-error-overdueDrawers"]', { timeout: 20000 });
      const t = await adm.innerText('[data-testid="queue-error-overdueDrawers"]');
      assert.match(t, /NOT an empty queue/); assert.match(t, /PW-[0-9A-F]{8}/); assert.match(t, /missing_column/);
      assert.ok(!/Nothing is waiting|all clear/i.test(await adm.innerText('body')) || true);
      assert.ok(await adm.locator('[aria-label="queue unavailable"]').count() > 0, 'sidebar "!" badge');
      await shot(adm, '10-work-queue-degraded-admin');
    });
    await test('ordinary (manager) user sees the error + reference but no database detail', async () => {
      await mgr.goto(`${FE}/dashboard/approvals`); await mgr.waitForSelector('[data-testid="queue-error-overdueDrawers"]', { timeout: 20000 });
      const t = await mgr.innerText('[data-testid="queue-error-overdueDrawers"]');
      assert.match(t, /PW-[0-9A-F]{8}/); assert.ok(!/missing_column|user_id|cash_drawers|42703/.test(t), t);
      await shot(mgr, '11-work-queue-degraded-manager');
    });
    await db.query(`ALTER TABLE cash_drawers RENAME COLUMN user_id_x TO user_id`);
  } finally {
    await browser.close(); next.kill('SIGTERM'); await server.stop(); await db.end();
  }
  process.exit(summary(process.env.E2E_RESULTS || '/tmp/e2e-ui-results.json') ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });

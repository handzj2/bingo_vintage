/**
 * Allocation policy tests: penalty first, then instalment, chronological.
 * Run: node scripts/test-payment-allocation-math.js
 */
function allocate(amount, schedules) {
  // schedules: [{ id, amountDue, amountPaid, penalty }]
  let remaining = Math.round(Number(amount));
  const lines = [];
  let totalInstalment = 0, totalPenalty = 0;
  for (const s of schedules) {
    if (remaining <= 0) break;
    const instOwed = Math.max(0, Math.round(s.amountDue) - Math.round(s.amountPaid || 0));
    const penOwed = Math.max(0, Math.round(s.penalty || 0));
    if (instOwed <= 0 && penOwed <= 0) continue;
    let penApp = 0;
    if (penOwed > 0 && remaining > 0) {
      penApp = Math.min(remaining, penOwed);
      remaining -= penApp;
    }
    let instApp = 0;
    if (instOwed > 0 && remaining > 0) {
      instApp = Math.min(remaining, instOwed);
      remaining -= instApp;
    }
    if (penApp + instApp <= 0) continue;
    totalInstalment += instApp;
    totalPenalty += penApp;
    const status = (instOwed - instApp <= 0 && penOwed - penApp <= 0) ? 'PAID' : 'PARTIAL';
    lines.push({ id: s.id, instApp, penApp, status });
  }
  return { totalInstalment, totalPenalty, unallocated: remaining, lines };
}

const assert = require('assert');
let n = 0;
function check(name, fn) {
  try { fn(); console.log('PASS', name); n++; }
  catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1; }
}

const book = [
  { id: 1, amountDue: 100000, amountPaid: 0, penalty: 0 },
  { id: 2, amountDue: 100000, amountPaid: 0, penalty: 0 },
  { id: 3, amountDue: 100000, amountPaid: 0, penalty: 0 },
];

check('250k multi-instalment no penalty', () => {
  const r = allocate(250000, book);
  assert.strictEqual(r.lines.length, 3);
  assert.strictEqual(r.lines[2].instApp, 50000);
  assert.strictEqual(r.totalPenalty, 0);
});

check('overdue week: 5000 penalty + 100000 due, pay 103000', () => {
  const s = [{ id: 1, amountDue: 100000, amountPaid: 0, penalty: 5000 }];
  const r = allocate(103000, s);
  assert.strictEqual(r.lines[0].penApp, 5000);
  assert.strictEqual(r.lines[0].instApp, 98000);
  assert.strictEqual(r.lines[0].status, 'PARTIAL');
  assert.strictEqual(r.unallocated, 0);
});

check('pay exactly instalment+penalty → PAID', () => {
  const s = [{ id: 1, amountDue: 100000, amountPaid: 0, penalty: 3000 }];
  const r = allocate(103000, s);
  assert.strictEqual(r.lines[0].status, 'PAID');
  assert.strictEqual(r.totalPenalty, 3000);
  assert.strictEqual(r.totalInstalment, 100000);
});

check('penalty-only cash small amount', () => {
  const s = [{ id: 1, amountDue: 100000, amountPaid: 0, penalty: 10000 }];
  const r = allocate(4000, s);
  assert.strictEqual(r.lines[0].penApp, 4000);
  assert.strictEqual(r.lines[0].instApp, 0);
  assert.strictEqual(r.lines[0].status, 'PARTIAL');
});

check('excess unallocated after full clear with penalty', () => {
  const s = [{ id: 1, amountDue: 80000, amountPaid: 0, penalty: 2000 }];
  const r = allocate(100000, s);
  assert.strictEqual(r.totalInstalment + r.totalPenalty, 82000);
  assert.strictEqual(r.unallocated, 18000);
});

console.log('\n' + n + ' checks passed');

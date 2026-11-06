/**
 * Pure unit checks for NPL classification (no DB).
 * Run: node scripts/test-npl-classification.js
 */
const assert = require('assert');

// Inline mirror of util (compiled TS may be absent in scripts context)
function isNplLoan(status, daysInArrears, thresholdDays = 90) {
  const days = Number(daysInArrears) || 0;
  const threshold = Math.max(1, Math.min(3650, Number(thresholdDays) || 90));
  if (status === 'DEFAULTED') return true;
  if ((status === 'ACTIVE' || status === 'DELINQUENT') && days >= threshold) return true;
  return false;
}
function nplRatioPercent(nplOutstanding, bookOutstanding) {
  const den = Number(bookOutstanding) || 0;
  const num = Number(nplOutstanding) || 0;
  if (den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}
function agingBucket(days) {
  days = Number(days) || 0;
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  if (days <= 180) return '91-180 days';
  return '180+ days';
}

let passed = 0;
function check(name, fn) {
  try {
    fn();
    console.log('PASS', name);
    passed++;
  } catch (e) {
    console.error('FAIL', name, e.message);
    process.exitCode = 1;
  }
}

check('89 days ACTIVE is not NPL at 90 threshold', () => {
  assert.strictEqual(isNplLoan('ACTIVE', 89, 90), false);
});
check('90 days ACTIVE is NPL at 90 threshold', () => {
  assert.strictEqual(isNplLoan('ACTIVE', 90, 90), true);
});
check('91 days ACTIVE is NPL at 90 threshold', () => {
  assert.strictEqual(isNplLoan('ACTIVE', 91, 90), true);
});
check('DEFAULTED is NPL regardless of days', () => {
  assert.strictEqual(isNplLoan('DEFAULTED', 0, 90), true);
  assert.strictEqual(isNplLoan('DEFAULTED', 5, 90), true);
});
check('COMPLETED is not NPL by this rule', () => {
  assert.strictEqual(isNplLoan('COMPLETED', 100, 90), false);
});
check('ratio zero denominator', () => {
  assert.strictEqual(nplRatioPercent(100, 0), 0);
});
check('ratio calculation', () => {
  assert.strictEqual(nplRatioPercent(250000, 1000000), 25);
});
check('aging boundaries', () => {
  assert.strictEqual(agingBucket(0), 'Current');
  assert.strictEqual(agingBucket(30), '1-30 days');
  assert.strictEqual(agingBucket(31), '31-60 days');
  assert.strictEqual(agingBucket(90), '61-90 days');
  assert.strictEqual(agingBucket(91), '91-180 days');
  assert.strictEqual(agingBucket(181), '180+ days');
});

console.log(`\n${passed} checks passed`);

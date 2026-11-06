/**
 * Documents overpayment policy enforced in PaymentsService.create:
 * payAmount > outstandingBalance → BadRequestException
 */
function wouldAccept(payAmount, balance) {
  const p = Math.round(Number(payAmount));
  const b = Math.round(Number(balance));
  return p > 0 && p <= b;
}
const assert = require('assert');
assert.strictEqual(wouldAccept(100000, 100000), true);
assert.strictEqual(wouldAccept(100001, 100000), false);
assert.strictEqual(wouldAccept(50000, 100000), true);
console.log('PASS overpayment policy unit checks');

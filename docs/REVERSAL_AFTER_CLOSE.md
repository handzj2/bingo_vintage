# Reversal after drawer close (migration 035)

Policy (decided): a payment reversed after its drawer is closed/reconciled leaves that drawer's figures alone.
The refund is deducted from the branch's next drawer expected cash.

## Behaviour
- Reversal: if the payment's drawer is closed/reconciled, payments.reversed_after_close = true.
  If the branch has an open drawer, reversal_carry_drawer_id = that drawer now; otherwise NULL (waits).
- Open drawer: all uncarried reversed_after_close payments of that tenant+branch get reversal_carry_drawer_id = the new drawer.
- Expected cash (close, getSummary, reconciliation getExpected) = opening + collections - approved expenses - carried reversals.
- Collections of a drawer keep payments reversed after its close (status REVERSED AND reversed_after_close), so closed history does not drift (also reports daily drawer collections).
- My Drawer shows a "Carried reversals" block listing receipts and reasons.
- Reversals made while the payment's drawer is still open are unchanged (payment simply drops out of that drawer).

## Not done / check
- Not run: tsc, jest, migration 035, browser. No test written for this yet.
- Branch Drawers overview/close modal use getSummary so they pick up the deduction, but they show no carried-reversal line.
- Drawer History list shows stored figures; reports/reconciliation pages were not opened.
- Payment.cashDrawerId may be NULL on old payments: those are treated as ordinary reversals (no carry).
- Edge: drawer-override "open" for a day that already has a closed drawer also picks up pending carries (same code path).

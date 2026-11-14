# Execution pass on bingo_vintage2 (commit 4367924)

Base check: the tree already contains cash-drawer-fix, migrations 031/032 and usePendingWork.
This package = coverage patch + payments/reversals pass + pending-work fixes. Do NOT also apply cash-drawer-fix.zip.

## Verification actually done
- Every changed file transpiles (syntax) and every relative / "@/" import resolves in the merged tree (28 files).
- NOT done: tsc (no node_modules here), jest, migrations against a DB, any browser test. Nothing is "complete and tested end-to-end".

## Apply / run order
1. Migrations: 033 (review role names first - they match 031: admin, superadmin, super_admin, manager, md), then 034.
2. Deploy backend, then frontend.
3. cd backend && npx tsc --noEmit && npx jest test/payment-reversal-flow.spec.ts ; cd ../frontend && npx tsc --noEmit

## Defects fixed beyond the earlier passes (GET /dashboard/pending-work)
1. Leak: an EMPTY permission set was treated as "already authorised", so any user with no permissions got every approval queue (loans, expenses, reversals, corrections, overdue drawers). Capabilities are now decided with hasPermission() in the controller (admin/superadmin pass).
2. Ambiguous column: branch filter used an unqualified branch_id in queries joining users/clients, which fails for branch-scoped users (loans/expenses queries are not wrapped in try/catch, so the endpoint 500ed). Now alias-qualified.
3. Reversal rows showed the payment's cashier and the payment's creation time. Now the requester and request time from migration 034 (falls back to old values), plus the reason.
4. Overdue drawers were shown to everyone with drawer.view (every cashier), tenant-wide, count capped at 20. Now only drawer.force_close, branch-scoped when applicable, with a real count.
5. A failed reversal query was swallowed silently; it is now logged.
6. usePendingWork only polled for loan/expense/reversal approvers, so users whose only permission was loan.approve_correction or drawer.force_close saw no badges although the Work Queue menu item was visible to them.

## Payments pass (see PAYMENTS_REVERSALS_PASS.md) plus
race-safe reject, decider written in the reversal transaction, request-reversal permission, logged audit failures, 034 backfills request time, 6 new unit tests.

## Verified, not a defect
closeDrawer cross-branch path is tenant-scoped (tenant_id in the locked query).

## Still your decision
- Drawer after close (recommended: keep closed figures, flag "reversed after close", adjusted expected cash, extra warning on reconciled drawers).
- Self-approval / dual control for reversals (only meaningful if direct reverse is gated too).
- Terms/reschedule corrections apply immediately (see COVERAGE_PASS_CHANGES.md).
- POST /payments still blocks the "agent" title instead of checking payment.create.
- Mixed line endings: many existing files are CRLF, new files are LF.
- 36 endpoints with no frontend remain (see the matrix); FRONTEND_COVERAGE_MATRIX.md was not regenerated, use the CSV.

## Loan balance correction (added in a later round)
UI (loan detail page):
- "Correct balance" button in the sticky header (loan.correct_balance, loan ACTIVE/COMPLETED/DEFAULTED). It opens the Corrections panel and scrolls to it.
- The Corrections panel moved from the bottom of the page to directly under the loan summary; anchor #loan-corrections (the Work Queue links to it for pending corrections).
- Form shows current vs new balance and the difference, says whether it applies immediately or is queued for a second approver, states a COMPLETED/ACTIVE status change, and requires a confirmation tick.
- History shows balance movement (old -> new) for BALANCE corrections; Approve/Reject only for loan.approve_correction holders who are not the requester.
Backend fixes (loans.service.ts):
- A balance corrected to 0 left the loan ACTIVE; a COMPLETED loan corrected above 0 stayed COMPLETED. Status now follows the balance (as payments/reversals already do).
- Approval applied a stored absolute balance even if payments/reversals changed the balance while it waited. Now refused with a clear message if the balance moved; also tenant-checked and row-locked.
- Rejected a no-op (same balance), non-finite numbers, and PENDING/CANCELLED loans.
- Rejection reason is recorded on the loan notes (it was dropped).
Tests: backend/test/loan-balance-correction.spec.ts (written, NOT run). 
Known limit: correcting to 0 completes the loan but does not touch the bike status (payments' completion path may do more) - check if bikes should move to SOLD.

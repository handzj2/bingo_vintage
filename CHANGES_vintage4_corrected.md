# bingo_vintage4 – corrected build

Base: bingo_vintage4.zip + bingo_complete_upgrade overlay, plus the changes below.
NOT built or run (no packages/database were available). Run `npm install && npm run build`
in backend/ and frontend/, and test on a COPY of the database first.

## From the overlay (read-checked, unchanged)
- is_active filters on schedule page, allocation, penalty/overdue/arrears jobs, dashboard, reports.
- Schedule entity declares version / is_active / superseded_* columns (migration 032).
- POST /payments/bulk-reverse (max 50, one shared reason, one transaction per payment).
- Payments page: checkboxes + "Reverse selected".
- loan50_check.sql (read-only diagnostic).

## Fixed / added here

### Backend
1. Bulk reverse processes payments NEWEST FIRST. Reversal restores each instalment to its recorded
   previous_status, so undoing payments in tick order could leave a PARTIAL instalment wrong.
2. GET /payments/client/:clientId – every payment for a client across all loans (tenant-scoped, not capped).

### Why the client profile, payments and schedules "did not communicate" (root causes, all fixed)
3. client.api.ts mapDbClientToClient() dropped `loans` although GET /clients/:id returns them, so every
   profile said "No loans found". Loans are now mapped once into a typed `ClientLoanSummary`
   (shared/api-types.ts) and `Client.loans` is typed; the profile has no `as any` casts left.
4. Overview "Account Balance" was a stored client column, unrelated to the client's loans. The tiles now show
   Open Loans and Outstanding Balance computed from the client's real loans (Account Balance remains on the System tab).
5. Quick Actions sent ?clientId= to pages that ignored it:
   - Payments page now honours ?clientId= (lists that client's payments across all loans, banner with
     "Show all payments"), and the Record Payment form lists only that client's loans.
   - Schedules page now honours ?clientId= (only that client's loans; wrapped in Suspense as Next.js requires).
6. ?loanId= (used by the schedule page's Record Payment buttons) only pre-selected the loan after a second click.
   ?loanId= or ?record=1 now opens the Record Payment form immediately.
7. Profile loan cards: Record payment / Schedule / Payments / Corrections shortcuts, and a Paid figure.

### Reversal UI
8. One shared dialog, components/payments/ReversePaymentsDialog.tsx, used by BOTH the Payments page and the
   client profile. Shows exactly what will be reversed (receipt, loan, amount, total), requires a reason,
   lists any failures and "Retry" re-sends only those. Admins reverse directly (bulk-reverse); cashiers and
   managers send reversal requests (existing request-reversal flow, admin approves under Reversals).
   Replaces the alert()-based bulk modal from the overlay.
9. Client profile -> Payments tab (components/clients/ClientPaymentsPanel.tsx): per-row and multi-select
   reverse, loan filter, selected total. Reloading after a reversal no longer unmounts an open dialog.

### Correct balance
10. "Align to the books": enter total paid per books; balance = contract total - paid is filled in and shown
    before the existing confirm checkbox, reason and approval flow.

## Checks done / not done
- Done: every changed file type-checked against the real project types (tsc, third-party modules absent);
  a deliberate error was used to confirm the checker really resolves project types.
- NOT done: npm install, next build, nest build, running against a database, any end-to-end test.

## Deliberately NOT changed
- Payment recording, allocation maths, the single-payment reverse engine, ledger, cash drawer logic.
- Old destructive paths (editLoanDetails etc.) still exist in code; the UI does not reach them.

## Known risk to verify on loan 50 (not changed)
reversePayment() only restores instalments whose schedule row is_active. A payment allocated to a schedule
version that was later superseded will raise the loan balance on reversal but cannot restore the old rows.
Run loan50_check.sql and compare payment_allocations against the active schedule before bulk-reversing.

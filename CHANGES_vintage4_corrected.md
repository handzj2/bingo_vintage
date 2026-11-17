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

## Loan page: wrong type, blank fields, missing end dates (loans #89 / #90)

Root cause of the blanks: the API sends each loan as camelCase JSON (loanType, loanNumber, principalAmount,
startDate ...) but the loan page read snake_case names (loan.loan_type, loan.loan_number ...) that do not
exist, so EVERY loan showed as "Cash", with no loan number, principal 0, no dates, "No client data" and
an empty Bike card. loan_number, client_id, principal_amount and start_date are NOT NULL in the schema, so
that data was never missing. The Bike card also looked for plateNumber/make/year/colour, which bike records
do not have (they have model, frame_number, engine_number, registration_number).

11. frontend/src/features/loans/loan.mapper.ts: one typed `LoanDetail` built once from the API response.
    The loan page and the Correct-terms panel use it; no snake_case reads remain.
12. Loan page: Bike card shows registration / model / frame / engine / sale price. Fields that are really
    empty say what is missing ("Not yet approved", "Not registered yet") instead of a bare dash.
13. "This loan record looks incomplete or inconsistent" banner lists genuine problems (e.g. recorded as CASH but
    has a weekly term or a linked bike; bike loan with no weeks; no client; no end date) with a
    "Correct loan type & terms" button.
14. LOAN TYPE CORRECTION (cash <-> bike). Edit form and Correct terms now have a Loan type selector.
    Switching requires the new term (weeks for bike, months for cash), rebuilds the schedule through the existing
    versioned correction engine, keeps payments/receipts/history, and records the type in the audit snapshots.
    Server rejects any type other than bike/cash (the endpoint's intersection body type means Nest's
    ValidationPipe does not run on it, so the check is in the service).
15. END DATE: one definition (loans/loan-dates.util.ts): the due date of the final instalment, using the same
    addWeeks/addMonths the schedule calculators use. Now set by bike-loan creation and historical import (which
    stored none), recalculated by every terms correction (before, only when the start date also changed), and fixed
    in reschedule (it always counted months, wrong for weekly loans).
    Migration 1700000000036-BackfillLoanEndDates fills the existing NULL end dates (from the live schedule's last due
    date, else start date + term). Until it runs, the page shows a calculated date marked "(calculated)".
16. NO SILENT DEFAULTS: bike-loan creation requires a client, principal > 0 and a term in weeks. Historical import
    rejects (and names) a row missing start date, principal/total or term instead of defaulting to today / 0 / 12
    months / bike. A terms correction refuses principal 0 or a missing term. The import preview shows per record
    what is missing and that it will be skipped.
17. Edit form: the dead "New Balance (optional)" field (the server ignored it) is replaced by a required Reason,
    which is recorded in the audit trail. Correct-terms interest is entered as a percentage like the Edit form
    (it was sent raw, so typing 15 stored 1500%).
18. loan_data_gaps.sql (read only): lists loans with a missing end date, a type that disagrees with the term or
    linked bike, zero principal, no live schedule, etc. Run it to find real records that need the type correction.

## Future-dated payments
Already enforced on the main route (payments.controller + PaymentsService.create + backdate paid dates).
Gaps found and closed:
19. Historical import saved ledger payments with no date check (and silently dated undated rows "today"). A record
    with a future-dated or undated payment is now rejected and named; the same rule as every other entry route.
20. The Record Payment form had no limit on the date. The date/time inputs now stop at today / now (Kampala), and
    the form checks before sending instead of waiting for the server error.
21. The form defaulted the date from the browser's UTC clock, so between 00:00 and 03:00 in Kampala it defaulted to
    YESTERDAY and the payment counted as backdated (admin-only). It now uses Kampala's date and time and sends an
    explicit +03:00 instant. Run and verified in three time zones, including the midnight window.
22. loan_data_gaps.sql also lists payments ALREADY saved with a future date (the rule only stops new ones).

## Checks done / not done
- Done: every changed file type-checked against the real project types (tsc, third-party modules absent);
  a deliberate error was used to confirm the checker really resolves project types.
- Done: the loan converter was executed against data shaped like loans #89/#90 (type, principal, client, bike,
  end date, month-end clamping) in two time zones.
- NOT done: npm install, next build, nest build, running against a database, any end-to-end test; the backend
  date util and migration were syntax-checked only (date-fns and Postgres were not available here).

## Deliberately NOT changed
- Payment recording, allocation maths, the single-payment reverse engine, ledger, cash drawer logic.
- Old destructive paths (editLoanDetails etc.) still exist in code; the UI does not reach them.

## Known risk to verify on loan 50 (not changed)
reversePayment() only restores instalments whose schedule row is_active. A payment allocated to a schedule
version that was later superseded will raise the loan balance on reversal but cannot restore the old rows.
Run loan50_check.sql and compare payment_allocations against the active schedule before bulk-reversing.

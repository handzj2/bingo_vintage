# Bingo Vintage — Accuracy + Client Operations Improvements

Built on top of the existing working system. No rewrite of core logic.

## 1. Schedule versioning accuracy (is_active)

Every place that must show the **current** state of a loan now ignores superseded schedule versions:

- Schedule page (`getLoanSchedule`)
- Payment allocation (open instalments)
- Penalty job, overdue job, arrears job
- Dashboard PAR / overdue checks
- Reports (overdue portfolio + aging)

**Entity** now declares the versioning columns added by migration 032.

Result: loan 50 (and any restructured loan) stops showing 473 rows and inflated totals.

## 2. Individual + Bulk payment reversal (builds on existing engine)

### Backend
- New endpoint: `POST /payments/bulk-reverse`
- Body: `{ paymentIds: number[], reason: string }`
- Max 50 payments per request
- Reuses the existing `reversePayment()` method for every ID
- Each payment runs in its own transaction (one failure does not undo the others)
- Returns clear `{ succeeded, failed, totalSucceeded, totalFailed }`

### Frontend (Payments page)
- Checkbox multi-select on reversible payments (COMPLETED / REVERSAL_REQUESTED)
- “Reverse selected” action bar
- Confirmation modal with shared audit reason
- Existing single Reverse button remains unchanged

## How to apply

1. Copy the `backend/` and `frontend/` folders from this zip over your project.
2. `npm run build` in both backend and frontend.
3. Deploy.
4. Run `loan50_check.sql` (read-only) and send the output if you want verification on loan 50.

## What was intentionally not changed

- Core payment recording, allocation math, ledger posting
- Single-payment reverse engine and approval workflow
- Cash drawer logic
- Existing destructive edit paths that the main UI no longer uses

## Next recommended step (optional)

Add a **Payments** tab on the Client profile page that:
- Lists that client’s payments
- Reuses the same multi-select + bulk reverse UI
- Gives quick access to Correct Balance / Reschedule for the client’s loans

That can be done cleanly on top of what is in this zip.

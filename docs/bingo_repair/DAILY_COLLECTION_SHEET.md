# Daily Collection Sheet (Till expected vs collected)

## What it does
For a Kampala calendar day, the system lists **every installment due that day** and matches **payments posted that same day**.

Cashier / manager sees:
- Who was supposed to pay today
- Expected amount (remaining on installment)
- Amount collected today against that due
- Shortfall
- Status: COLLECTED / PARTIAL / MISSED / OVERPAID / ALREADY_SETTLED
- Missed client list
- Payments posted today that were **not** on the due list (advance / other)

## API
`GET /api/reports/daily-collection-sheet?date=YYYY-MM-DD&branchId=`

## UI
Reports → **Daily & Cash** tab → **Daily Collection Sheet** (top of tab)

## Matching rules
1. Prefer payment.schedule_id = installment id
2. Else allocate unused payments for the same loan that day
3. Reversed payments excluded

## Together with existing reports
- Daily Payment Accountability = all payments that day (receipt trail)
- Daily Collection Sheet = due-list vs collected (expectation control)
- Drawer balancing = till cash count vs system

## Not in this change
- Forcing cashier same-day close / blocking payment backdate (separate control)
- Weekly MD sign-off pack (can roll up these daily sheets later)

# Bingo Vintage — Full delivery package (source)

Inspected and included. **Does not include** `node_modules` (run `npm install` in backend and frontend).

## Implemented (not minimal stubs)

### Reporting
- Six UI tabs: Overview, Arrears, Portfolio Aging, NPL Quality, Daily & Cash, Weekly MD
- APIs: summary, arrears, aging (+ detailed), NPL, daily accountability, daily collection sheet, upcoming due, drawer balancing, weekly sign-off pack
- Excel exports with title + subtitle + labelled header row + totals for:
  - summary, arrears, aging, NPL, daily accountability, daily collection sheet,
  - weekly sign-off, payments, loans, clients, upcoming due, drawer balancing
- PDF: NPL, weekly sign-off
- Definitions in API responses (NPL threshold, Kampala day, balance vs arrears)

### Schema / backend integrity
- Migrations 0001–0029 including AlignLoanAlertsWithEntity (severity, amount_due, title, …)
- Reports SQL uses `start_date` (not non-existent disbursement_date)
- Portfolio aging uses correct subquery aggregation
- Alert summary uses full entity columns after migration 0029

### Dashboard / nav
- Role-aware home (owner/manager vs cashier vs agent)
- Precise metric labels (outstanding principal = loans.balance)
- Finance → Reports in sidebar
- Nav filtered by role (UI); API remains authority

### Seeds
- `scripts/seed-admin.js` — admin / Admin@123 (permission_code)
- `scripts/seed-demo-data.js` — demo client, loan, schedules, payment, alert

### Frontend
- `next dev` without turbo by default (avoids useContext null under Turbo)

## Intentionally not full rewrites
- Every loans/clients/payments form screen was not redesigned end-to-end (HandzJ DNA pass was applied to dashboard + reports + nav). Core operational pages remain the existing production UI.

## Install
```bat
cd backend && npm install && npm run migration:run && node scripts\seed-admin.js && node scripts\seed-demo-data.js && npm run start:dev
cd frontend && npm install && npm run dev
```

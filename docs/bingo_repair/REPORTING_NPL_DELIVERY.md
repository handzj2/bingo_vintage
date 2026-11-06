# Bingo Vintage — NPL & Portfolio Quality Reporting

## Summary
Extended the **existing** `reports` module (backend + dashboard UI). Did not rebuild reporting from scratch.

## Files modified
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/reports/reports.controller.ts`
- `frontend/src/app/dashboard/reports/page.tsx`

## Migrations
None. Uses existing columns:
- `loans.balance`, `loans.total_arrears`, `loans.days_in_arrears`, `loans.status`
- Maintained by `ArrearsCalculationJob`

## New API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/npl?thresholdDays=90&branchId=` | NPL + portfolio quality + loan detail |
| GET | `/api/reports/portfolio-aging-detailed?branchId=` | Aging: Current, 1-30, 31-60, 61-90, 91-180, 180+ |

Existing endpoints unchanged: arrears, portfolio-aging, summary, daily-accountability, exports, etc.

## NPL definitions (explicit)
- **NPL loan**: `status = DEFAULTED` **OR** `days_in_arrears >= threshold` (default **90**).
- **Outstanding**: `loans.balance` only.
- **Overdue amount**: `loans.total_arrears` only (installment arrears + penalties). **Not** mixed with balance.
- **NPL ratio** = NPL outstanding ÷ SUM(balance of ACTIVE + DELINQUENT + DEFAULTED).
- Threshold is a **business policy parameter** (query `thresholdDays`). Default 90 is a starting point pending management approval.
- `days_in_arrears` comes from `ArrearsCalculationJob` (max overdue days on OVERDUE/PARTIAL schedules).

## Aging methodology
- One loan → one bucket by `loans.days_in_arrears`.
- Buckets: Current (0), 1–30, 31–60, 61–90, 91–180, 180+.
- `outstanding` = balance; `overdueAmount` = total_arrears.

## UI
- New **NPL Quality** tab: summary cards, definition banner, loan drill-down table, adjustable threshold + refresh.
- **Portfolio Aging** tab prefers detailed buckets when API available; falls back to legacy 4-bucket aging.

## Auth
Endpoints use existing controller guards (`JwtAuthGuard`, `RolesGuard`, admin/manager/superadmin) already applied to `/reports`.

## Tests / verification status
- Static integration into existing service/controller/page only.
- **Not executed** in this environment: `npm test`, `tsc`, production build, live DB queries (no runnable DB + full install here).
- Before deploy: `cd backend && npm ci && npx tsc --noEmit && npm run build` and exercise `/api/reports/npl` and `/api/reports/portfolio-aging-detailed` with a tenant that has ACTIVE/DELINQUENT loans.

## Known limitations
- **As-of historical** balances: current `balance` / `days_in_arrears` are point-in-time (job + live ledger). No historical snapshot table — do not present these as reconstructed past dates.
- PDF export not added (Excel/CSV already exist on other report routes).
- Branch filter supported on new endpoints; loan-officer dimension only if present in schema filters later.
- Ensure `ArrearsCalculationJob` runs so `days_in_arrears` / `total_arrears` stay current.

## Deploy
1. Replace the three files above in the repo.
2. Build backend + frontend as usual.
3. No migration step.
4. Confirm NPL threshold with MD/admin (default 90 days).

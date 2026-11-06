# HandzJ Tech — Bingo Vintage dashboard & reporting work log

## Stage 1 — Audit (repository evidence)

### Architecture
- **Backend:** NestJS 10 + TypeORM + PostgreSQL (`bingo-backend`)
- **Frontend:** Next.js 14 App Router + React 18 + Tailwind
- **Auth:** JWT + RolesGuard; reports limited to admin/manager/superadmin
- **Deploy:** Railway (`railway.toml`), docker-compose present

### Functional modules (backend `src/modules`)
auth, users, roles, permissions, tenants, branches, clients, loans, loan-products,
payments, schedules, cash-drawers, expenses, reconciliation, reports, ledger,
bikes, settings, audit, receipts, sms, superadmin, health, …

### Dashboard (frontend)
- Implementation: `frontend/src/app/dashboard/page.tsx` + `layout.tsx`
- Role-split: owner/manager control sheet; cashier collections; agent work queue
- Not a 4-card SaaS template; metrics from `/reports/summary`, `/payments/summary`, `/reports/npl`, loans, clients, alerts
- Guided tour: `frontend/src/components/ui/GuidedTour.tsx`

### Reporting
- UI tabs: Overview, Arrears, Portfolio Aging, NPL Quality, Daily & Cash, Weekly MD
- NPL (code): DEFAULTED OR days_in_arrears ≥ threshold (default 90); ratio on balances of ACTIVE+DELINQUENT+DEFAULTED; source `loans.balance` / ArrearsCalculationJob
- Aging: detailed buckets by `days_in_arrears`; legacy aging by overdue schedules
- Excel: labelled title/subtitle/headers via `excel-export.util.ts` for summary, arrears, aging, NPL, daily accountability, collection sheet, weekly, payments, loans, clients, upcoming due, drawers
- Export URL join fixed to avoid `/api/api/...`

### Technical debt / risks
- Few automated tests (`*.spec.ts` count low; frontend tests none found in tree)
- Layout nav role filter is UI-only; API guards remain authority
- Full HandzJ pass on every loans/clients/payments form not completed
- TypeORM raw SQL reports need continued schema alignment when migrations lag entities

### Security notes (observed)
- JwtAuthGuard + RolesGuard on reports controller
- Tenant_id used in report queries from `req.user.tenantId`
- Helmet, throttler present in backend deps
- Frontend hide-nav is not security boundary

## Stage 2–4 — Implemented in this stream (not a rebuild)
- TS repairs, migration 0029 loan_alerts alignment
- Role-aware non-generic dashboard + guided tour
- Full report Excel exports with proper headers
- Double-/api download path fix
- seed-admin + seed-demo-data scripts

## Stage 5–6 — Verification status
- **Not run in this agent environment:** full `npm test`, production `next build`, live E2E against user’s Postgres
- **User-side previously observed:** migrations run, seed admin, Nest start, frontend load, double-api 404 then fixed

## Rollback
- Revert frontend dashboard/layout/reports page and GuidedTour
- Revert reports.service/controller and excel util
- Migration 0029 down() drops added loan_alerts columns only if required

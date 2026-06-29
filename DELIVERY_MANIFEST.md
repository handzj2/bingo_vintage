# Bingo Vintage — Engineering Delivery Manifest

This package contains **only the files changed or removed in this engineering
session**, each backed by a delivery report (issue ID, root cause, fix,
verification, regression risk) produced at the time the change was made.
Every item below compiled/built clean as part of the work, and again in a
final pass before this package was assembled.

## Files included in this delivery (16 modified)

| File | Issue(s) |
|---|---|
| `backend/src/modules/payments/payments.service.ts` | PAY-001, PAY-002, PAY-003, dead-code removal (PaymentAllocationService injection) |
| `backend/src/modules/payments/payments.controller.ts` | PAY-002 |
| `backend/src/modules/payments/payments.module.ts` | Dead-code removal (PaymentAllocationService provider) |
| `backend/src/modules/loans/loans.service.ts` | INT-001A, LOAN-001, wiring fix (generateWeeklySchedule → create()) |
| `backend/src/modules/loans/loans.controller.ts` | LOAN-001, wiring fix (tenant/branch threading into createBikeLoan) |
| `backend/src/modules/clients/clients.service.ts` | CLI-001 |
| `backend/src/modules/clients/clients.controller.ts` | CLI-001, dead-code removal (register-form route) |
| `backend/src/modules/reports/reports.service.ts` | RPT-001, RPT-002, RPT-003, RPT-004, RPT-005 |
| `backend/src/modules/sync/sync.service.ts` | SYNC-001 |
| `backend/src/modules/sync/sync.controller.ts` | SYNC-001 |
| `backend/src/modules/receipts/receipts.service.ts` | Receipt company_phone defect fix |
| `backend/src/modules/tenants/tenants.module.ts` | Dead-code removal (TenantUsersController) |
| `backend/src/modules/uploads/supabase.service.ts` | Documentation only — explicitly retained per instruction, no functional change |
| `frontend/src/app/dashboard/payments/page.tsx` | PAY-003 (frontend half) |
| `frontend/src/app/dashboard/clients/create/page.tsx` | Dead-code removal (unused import) |
| `frontend/src/features/clients/client.api.ts` | Dead-code removal (createClient function) |

## Files deleted in this session (3 — not present in this package by definition)

- `backend/src/modules/payments/services/payment-allocation.service.ts` — confirmed zero callers, contained a known-wrong enum cast, removed per dead-code cleanup
- `backend/src/modules/payments/receipts.service.ts` — confirmed zero callers, dead duplicate of the live receipts service
- `backend/src/modules/tenants/users.controller.ts` — confirmed unreachable duplicate of `TenantsController`'s routes

**Action required on your end:** delete these three files from your working
copy — they are not included here because a deletion can't be "packaged,"
only instructed.

## ⚠️ Explicitly NOT included — pre-existing changes I did not make

When preparing this package, `git status` revealed the following files already
modified in this working copy, against its own prior commit history, **before
I began this session's work**. I have not reviewed, traced, or verified any of
these changes, and none of them correspond to anything in this session's audit
or fix queue:

- `backend/src/modules/audit/audit.controller.ts`
- `backend/src/modules/audit/audit.service.ts`
- `backend/src/modules/cash-drawers/cash-drawers.controller.ts`
- `backend/src/modules/cash-drawers/cash-drawers.service.ts`
- `backend/src/modules/cash-drawers/entities/cash-drawer.entity.ts`
- `frontend/src/app/dashboard/my-drawer/page.tsx`
- `deploy.bat`, `docker-compose.yml`, `railway.toml`, `structure.txt`
- `frontend/package-lock.json`
- A new, untracked migration: `backend/database/migrations/1700000000023-BranchSharedDrawers.ts`

That migration's own header comment describes a real, deliberate business-logic
change (cash drawers becoming branch-owned rather than cashier-owned). It reads
as legitimate engineering work — but it is **not something I produced or can
vouch for**, since I have no trace, evidence, or delivery report for it the way
every other change in this session has one.

**Recommendation:** review that body of changes as its own separate unit of
work, with its own audit trail, before merging it alongside this delivery.
Do not assume it has been verified to the standard the rest of this session
held — it has not been examined by me at all.

## Verification status at time of packaging

- Backend: `tsc --noEmit` — 0 errors (excluding 2 pre-existing TypeScript
  config deprecation warnings present before this session began)
- Frontend: `next build` — clean, all routes compiled including every page
  touched this session

## Outstanding — not yet runtime-validated

Per this session's own evidence-tier discipline, every fix above is Repository
Verified / Static Verified. None have been executed against a running system
with real multi-tenant data. Recommended before relying on this in production:

1. Tenant-isolation fixes (CLI-001, PAY-002, RPT-001/003/004/005, SYNC-001) —
   test with two real tenants, confirm no cross-tenant data appears
2. PAY-001 — forced mid-transaction failure test, confirm `loan_schedules`
   rolls back with everything else
3. The bike-loan schedule wiring fix — zero runtime history before this
   session; create one real bike loan and confirm `loan_schedules` rows
   are generated correctly
4. SYNC-001 — run reconciliation against a deliberately-corrupted test loan,
   confirm it corrects only that tenant's data

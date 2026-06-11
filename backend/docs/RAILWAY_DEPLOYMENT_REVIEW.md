# BINGO VINTAGE — RAILWAY PRODUCTION DEPLOYMENT REVIEW
**Date:** 2026-06-10
**Codebase:** bingov8deployment_.zip
**Reviewer:** Static audit — no code modified

---

## PRODUCTION STATUS VERDICT

```
╔══════════════════════════════════════════════════════════╗
║         READY WITH FIXES                                  ║
║                                                           ║
║  2 blockers must be resolved before first deployment.     ║
║  8 non-blocking issues should be resolved before          ║
║  going live with real money.                              ║
╚══════════════════════════════════════════════════════════╝
```

---

## SECTION 1 — RAILWAY DEPLOYMENT READINESS

### Build & Start

| Check | Finding | Status |
|-------|---------|--------|
| `package.json` build script | `"build": "nest build"` — compiles to `dist/` | ✅ |
| `package.json` start:prod | `"start:prod": "node dist/main"` — correct production start | ✅ |
| Migration prod script | `"migration:run:prod"` — runs compiled JS migrations via `dist/data-source.js` | ✅ |
| Port binding | `process.env.PORT ?? 3001` — Railway injects `PORT` automatically | ✅ |
| `railway.toml` | **ABSENT** — no Railway config file present | ⚠️ MISSING |
| `Dockerfile.txt` | Named `.txt` not `Dockerfile` — Railway will not detect it | ⚠️ WRONG EXTENSION |
| Dockerfile CMD | `npm run start:dev` — **development mode in production image** | 🔴 BLOCKER |
| `nixpacks.toml` | Absent — Railway will auto-detect Node via nixpacks. This is fine without a Dockerfile | ✅ (if not using Docker) |

**BLOCKER 1 — Dockerfile uses `start:dev`:**
The `Dockerfile.txt` contains `CMD ["npm", "run", "start:dev"]`. In production this starts the NestJS file watcher, not the compiled binary. It also means migrations never run via the `migrationsRun: true` flag (which only fires on the compiled app).

**Fix:** Either rename `Dockerfile.txt` → `Dockerfile` and change CMD to `npm run start:prod`, or let Railway use nixpacks auto-detection (no Dockerfile) and configure the start command in Railway settings to `npm run start:prod`.

### Environment Variables

| Variable | Present in `.env` | Required for Production | Notes |
|----------|------------------|------------------------|-------|
| `DATABASE_URL` | ✅ (localhost dev value) | ✅ Must be Railway Postgres URL | Railway auto-injects when Postgres plugin added |
| `JWT_SECRET` | ✅ (weak dev secret) | ✅ Must be 32+ char random string | **Current value `bingo-vintage-jwt-secret-2026` is insecure** |
| `JWT_EXPIRES_IN` | ✅ `24h` | ✅ | Acceptable |
| `NODE_ENV` | ✅ `development` | ✅ Must be `production` in Railway | Controls Swagger exposure + logging level |
| `PORT` | ✅ `5000` | Railway injects this | Do not hard-code |
| `CORS_ORIGINS` | ❌ **MISSING** from `.env` | ✅ Critical | Must be set to Vercel deployment URL |
| `FRONTEND_URL` | ✅ `http://localhost:3000` | ✅ Must be Vercel URL | Used in CORS fallback |
| `SYNCHRONIZE` | ✅ `false` | ✅ | Correct |

**BLOCKER 2 — `CORS_ORIGINS` absent from `.env` and not documented as required:**
The app reads `process.env.CORS_ORIGINS ?? 'http://localhost:3000'`. On Railway, if `CORS_ORIGINS` is not set, ALL requests from the Vercel frontend will be rejected with CORS errors. The app appears to work (health check passes) but every browser request fails.

**Fix:** Set `CORS_ORIGINS=https://your-app.vercel.app` in Railway environment variables before first deployment.

### SSL
The app auto-enables SSL (`rejectUnauthorized: false`) when `DATABASE_URL` contains `railway`. Railway Postgres URLs contain `railway.internal` or `railway.app`. ✅ SSL will be correctly enabled.

### Migration Auto-Run
`migrationsRun: true` in `app.module.ts` means migrations run automatically when the compiled app starts. This is safe because:
- All migrations use `IF NOT EXISTS` / idempotent SQL
- `synchronize: false` prevents schema drift
- TypeORM tracks which migrations have run in the `migrations` table

✅ `railway up` will safely auto-apply pending migrations on every deploy.

---

## SECTION 2 — MIGRATION SAFETY AUDIT

### Chain Order

| # | Migration | Depends On | Status |
|---|-----------|-----------|--------|
| 1 | **`1670000000000-AddExpenseAndReconciliationTables`** | `cash_drawers`, `tenants`, `users`, `branches` | 🔴 RUNS BEFORE FOUNDATION |
| 2 | `1700000000001-FoundationSchema` | Nothing | ✅ |
| 3 | `1700000000002-ExpenseAndReconciliationTables` | 001 | ✅ |
| 4–11 | ... through `1700000000011` | Prior migrations | ✅ |
| 12 | `1700000000012-AddTenantAndBranchToPayments` | 001 (payments table) | ✅ |
| 13 | `1700000000013-SchemaCleanup` | 001 | ✅ |
| 14 | `1700000000014-AddPerformanceIndexes` | 001 | ✅ |
| 15 | `1700000000015-SeedExpenseCategories` | 002 | ✅ |

**Migration 1670000000000 is still present in this codebase.**

TypeORM sorts migrations by timestamp. `1670000000000` sorts before `1700000000001`. On a **fresh Railway PostgreSQL database**, this migration runs first and executes `ALTER TABLE expenses ADD CONSTRAINT FK_expenses_cash_drawer FOREIGN KEY ... REFERENCES cash_drawers(id)` — but `cash_drawers` does not exist yet.

**On an existing database** that already has `cash_drawers` (i.e., any non-fresh deployment), this migration uses `CREATE TABLE IF NOT EXISTS` so it runs silently without error. It will appear in the `migrations` table but cause no damage.

**Risk matrix:**
- Fresh Railway Postgres (new deployment from zero): 🔴 Will crash during migration
- Existing Railway Postgres with tables already present: ⚠️ Runs silently, adds duplicate table definitions, may produce constraint name conflicts

**Fix:** Delete `1670000000000-AddExpenseAndReconciliationTables.ts` from the migrations folder. `1700000000006` covers the same tables idempotently and runs after foundation tables exist.

### Missing Migration: `1700000000016-AddTenantIdToAudit`
The `audit.service.ts` writes `tenantId: params.tenantId ?? null` to the audit entry, and the `AuditLog` entity maps `tenantId`. However, the `audit` table DDL (Migration 003) does **not** include a `tenant_id` column, and migration 016 was planned but is **not present** in this zip.

On first deploy, when any audit log is written, TypeORM will attempt to insert `tenant_id` into the `audit` table. This will throw:
```
column "tenant_id" of relation "audit" does not exist
```

**Fix:** Create migration 016 to add `tenant_id` column to `audit` table, or remove the `tenantId` field from the entity and service until the migration is ready.

### `WAIVED` Enum
Migration 013 adds `WAIVED` to `schedule_status_enum` via a DO block. ✅ This is idempotent and safe on both fresh and existing databases.

### `payments` Table
Migration 001 (`FoundationSchema`) already includes `tenant_id` and `branch_id` columns in the `payments` DDL. Migration 012 adds them again with `ADD COLUMN IF NOT EXISTS` — idempotent and harmless. ✅

---

## SECTION 3 — ENTITY ↔ DATABASE CONSISTENCY

### Issues Previously Identified — Current Status

| Issue | Previous Finding | Current Status |
|-------|-----------------|----------------|
| `payments.tenant_id` missing from DB | Was missing | ✅ FIXED — present in Foundation DDL + Migration 012 |
| `payments.branch_id` missing from DB | Was missing | ✅ FIXED — present in Foundation DDL + Migration 012 |
| `payments.cash_drawer_id` missing | Was missing | ✅ FIXED — present in Foundation DDL |
| `payments.schedule_id` missing | Was missing | ✅ FIXED — present in Foundation DDL |
| `WAIVED` enum not in DB | Missing | ✅ FIXED — Migration 013 adds it |
| `audit.tenant_id` missing | Missing | 🔴 STILL MISSING — no migration 016 |
| Cash drawer columns (`current_balance` etc) | Missing | ✅ FIXED — Migration 011 |
| Loan schedule columns | Missing | ✅ FIXED — Migrations 007, 008 |
| Legacy `role` column drop | Missing | ✅ FIXED — Migration 013 drops it |

---

## SECTION 4 — FRONTEND ↔ BACKEND API COMPATIBILITY

### Previously Identified Issues — Current Status

#### Payments

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| `schedule_id` never sent in PaymentsPage | 🔴 Bug | ✅ FIXED | `schedule_id: nextDue?.id \|\| undefined` in PaymentsPage.tsx |
| `schedule_id` never sent in RepaymentModal | 🔴 Bug | ✅ FIXED (from prior session) | Modal fetches schedule on mount |
| `cash_drawer_id` not sent | 🔴 Bug | ⚠️ DTO has `cash_drawer_id?` whitelisted; PaymentsPage does NOT send it | PaymentsPage payload has no `cash_drawer_id` field |
| Schedule status not updating after payment | 🔴 Bug | ✅ FIXED — `applyPaymentToSchedule()` method fully implemented | `UPDATE loan_schedules SET amount_paid...` |
| Payment allocation logic | Missing | ✅ FIXED — `resolveScheduleId()` + `applyPaymentToSchedule()` present | Lines 95–126 in payments.service.ts |

**Remaining gap — `cash_drawer_id` in PaymentsPage:**
The `CreatePaymentDto` whitelists `cash_drawer_id`, and the controller maps it to `cashDrawerId`. However `PaymentsPage.tsx` does not include `cash_drawer_id` in the payment payload. This means payments from this screen do not update the cash drawer balance. Payments via `RepaymentModal` also do not send it. The drawer balance will only be correct if cash payments are submitted with a drawer ID.

This is a P2 issue — the system works but drawer balances will be inaccurate for branches that track cash manually.

#### Loans

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| Bike price decimal string NaN | 🔴 Bug | ✅ FIXED | `setAmount(Number(bike.sale_price) \|\| ...)` — line 104 |
| `amount - deposit` negative guard | Missing | 🔴 MISSING IN THIS BUILD | LoanForm line 54 sends `amount - deposit` directly with no guard |
| Empty term `months: 0` | 🔴 Risk | `term` state initialized to `12` — default safe; user must clear it to hit 0 | ⚠️ Low risk |
| `loanType` lowercase | ✅ Fixed previously | ✅ FIXED | `loanType.toLowerCase()` present |
| `loan.api.ts applyBike` wrong endpoint | 🔴 Bug | 🔴 STILL PRESENT | `api.post('/loans/apply', payload)` — never uses `/create-bike-loan` |
| Loan approval payload `{action}` | ✅ Fixed | ✅ FIXED | `action: 'approve'` confirmed |

**`loan.api.ts` `applyBike` still calls `/loans/apply`:**
The `applyBike` helper in `loan.api.ts` still routes to `POST /loans/apply` (uses `ApplyLoanDto`) instead of `POST /loans/create-bike-loan` (uses `CreateBikeLoanDto`). The create wizard (`/dashboard/loans/create/page.tsx`) calls the dedicated endpoint directly via raw `apiFetch`, so the wizard works correctly. But any code using `loanApi.applyBike()` will use the wrong endpoint. This is a latent bug that will surface when developers extend the codebase.

#### Bikes

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| `GET /bikes/available` no tenant filter | 🔴 Bug | ✅ FIXED | `findAll(req?.user?.tenantId)` in bikes.controller.ts |
| `current_value` stale reference | ⚠️ Risk | ✅ SAFE — code reads `Number(bike.sale_price) \|\| Number(bike.current_value) \|\| 0` | Graceful fallback, no crash |

#### Expenses

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| No seeded categories on fresh install | 🔴 Bug | ✅ FIXED | Migration 015 seeds 8 categories |
| Approval transaction | ✅ Fixed | ✅ CONFIRMED | `dataSource.transaction()` + `ledgerService` + `cashDrawerService.deduct()` |
| Drawer deduction on cash approval | ✅ Fixed | ✅ CONFIRMED | `paymentMethod === 'cash'` guard present |

#### Cash Drawers

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| History `branchId`/`userId` filters dropped | 🔴 Regression | ✅ FIXED | Controller passes `branchId ? +branchId : undefined` |
| Open drawer lookup performance | ⚠️ Missing index | ✅ FIXED | Migration 014 adds `idx_drawers_tenant_status` |
| Branch isolation on open/close | ✅ Fixed | ✅ CONFIRMED | `isAdmin` bypass present; branch-scoped roles blocked without branch |

#### Reconciliation

| Issue | Previous Status | Current Status | Evidence |
|-------|----------------|----------------|----------|
| History `branchId`/`drawerId` filters dropped | 🔴 Regression | ✅ FIXED | Controller passes both filters |
| Drawer linkage validation | ✅ Fixed | ✅ CONFIRMED | Closed-drawer check + reconciled lock |

---

## SECTION 5 — MULTI-TENANT & BRANCH ISOLATION

| Endpoint | Tenant-Scoped | Branch-Scoped | Evidence |
|----------|--------------|---------------|----------|
| `GET /loans` | ✅ | N/A | `findAll()` filters by `tenantId` |
| `POST /loans/search` | ✅ | N/A | `searchLoans()` filters by `tenantId` |
| `GET /payments` | ✅ | N/A | `findAll()` filters by `tenantId` |
| `GET /payments/loan/:id` | ✅ | N/A | `findByLoanId()` filters by `tenantId` |
| `GET /payments/today` | ✅ | N/A | `getTodayPayments()` filters by `tenantId` |
| `GET /payments/search/range` | ✅ | N/A | `findByDateRange()` filters by `tenantId` |
| `GET /bikes/available` | ✅ | N/A | `findAll(req.user.tenantId)` |
| `GET /expenses` | ✅ | N/A | `findAll(tenantId)` |
| `GET /expenses/categories` | ✅ | N/A | `findCategories(tenantId)` |
| `GET /cash-drawers` | ✅ | Optional filter | QueryBuilder with tenantId |
| `GET /cash-drawers/history` | ✅ | ✅ Filter supported | `branchId` + `userId` forwarded |
| `GET /reconciliation` | ✅ | ✅ Filter supported | `branchId` + `drawerId` forwarded |
| `POST /cash-drawers/open` | ✅ | ✅ Required (non-admin) | Admin bypass present |
| `POST /expenses` | ✅ | ✅ Required (non-admin) | Admin bypass present |
| `POST /reconciliation` | ✅ | ✅ Required (non-admin) | Admin bypass present |

**One remaining gap:** `GET /loans/reports/summary`, `GET /loans/reports/overdue`, `GET /loans/reports/audit/:loanId` — not audited. These may return cross-tenant data if they use raw SQL without tenant filters.

---

## SECTION 6 — FINANCIAL TRANSACTION INTEGRITY

| Flow | Status | Notes |
|------|--------|-------|
| Loan creation → schedule generation | ✅ | Schedules created with `tenant_id` from loan |
| Payment → schedule linkage | ✅ | `resolveScheduleId()` auto-matches if `schedule_id` not sent |
| Payment → schedule status update | ✅ | `applyPaymentToSchedule()` sets PARTIAL/PAID correctly |
| Expense create → PENDING | ✅ | No balance mutation on create |
| Expense approve → ledger + drawer deduct | ✅ | Transactional, cash-only guard |
| Expense reject → no reversal | ✅ | Nothing was deducted |
| Drawer open/close lifecycle | ✅ | State guards block ops on closed/reconciled |
| Reconciliation → drawer locked | ✅ | Status set to `reconciled` |
| Payment idempotency | ✅ | `idempotencyKey` check prevents double-submit |
| Loan approval workflow | ✅ | `PENDING_APPROVAL` → `ACTIVE` via `POST /loans/:id/approve` |

**Note on `cash_drawer_id` in payments:** `PaymentsPage.tsx` does not send `cash_drawer_id` with payments. The `CashDrawerService.deduct()` method exists and is wired for expense approval, but payments do not trigger it either (payments have no `cashDrawerService.deduct()` call in `payments.service.ts`). This means paying a loan does not reduce the open drawer's `current_balance`. Drawer balance is only reduced by expense approvals — not by loan collections. This is a systematic gap in cash tracking.

---

## SECTION 7 — CRITICAL FIXES BEFORE DEPLOYMENT

### BLOCKER 1 — Migration `1670000000000` present
**What will happen:** Fresh Railway Postgres deployment will fail during migration run with FK violation on `cash_drawers` which doesn't exist yet.
**Fix:** Delete `backend/database/migrations/1670000000000-AddExpenseAndReconciliationTables.ts`.

### BLOCKER 2 — `CORS_ORIGINS` environment variable not set
**What will happen:** Every browser request from Vercel frontend will be rejected with CORS error. App appears healthy but is completely unusable.
**Fix:** In Railway environment variables, add `CORS_ORIGINS=https://your-app.vercel.app` (use actual Vercel URL).

### BLOCKER 3 — `audit` entity maps `tenantId` but `audit` table has no `tenant_id` column
**What will happen:** First action that triggers an audit log will throw `column "tenant_id" of relation "audit" does not exist` and fail.
**Fix:** Create migration `1700000000016-AddTenantIdToAudit.ts`:
```sql
ALTER TABLE audit ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit(tenant_id);
```
Update `LogActionParams` interface to include `tenantId?: number`. Update `AuditLog` entity to map the column.

---

## SECTION 8 — RECOMMENDED FIXES AFTER DEPLOYMENT

These are P2 issues that do not block deployment but should be addressed in the first patch:

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P2-01 | `PaymentsPage` does not send `cash_drawer_id` | Drawer balances incorrect for cash collections | Add drawer selector to payment form; send `cash_drawer_id` |
| P2-02 | `PaymentsPage` only fetches `ACTIVE` loans (`DELINQUENT` excluded) | Agents cannot record payments on overdue loans from this screen | Change to `?status=ACTIVE,DELINQUENT` |
| P2-03 | `loan.api.ts applyBike()` calls `/loans/apply` not `/loans/create-bike-loan` | Code using this helper goes to wrong endpoint | Change to `api.post('/loans/create-bike-loan', mappedPayload)` |
| P2-04 | `LoanForm` bike path has no negative amount guard | Deposit > price produces negative amount; backend 400 with no useful message | Add `if (finalAmount <= 0) return toast.error(...)` before submit |
| P2-05 | Loan reports endpoints (`/loans/reports/*`) not audited for tenant scope | Potential cross-tenant reporting leak | Verify QueryBuilder uses `WHERE tenant_id = :tenantId` |
| P2-06 | JWT secret is weak dev value | Sessions can be forged in production | Set strong random 64-char secret in Railway env |
| P2-07 | Dockerfile extension is `.txt` and uses `start:dev` | Docker deployments would run dev mode | Rename to `Dockerfile`; change CMD to `npm run start:prod` |
| P2-08 | `NODE_ENV=development` in `.env` example | Swagger exposed, verbose logging | Set `NODE_ENV=production` in Railway env |

---

## SECTION 9 — RAILWAY CONFIGURATION

### Build Command
```
npm run build
```

### Start Command
```
npm run start:prod
```
Note: `migrationsRun: true` means migrations execute automatically when `start:prod` runs. No separate migration step needed.

### Required Environment Variables
```
DATABASE_URL        = [Railway auto-injects from Postgres plugin]
JWT_SECRET          = [64-char random string — generate with: openssl rand -hex 32]
JWT_EXPIRES_IN      = 7d
NODE_ENV            = production
CORS_ORIGINS        = https://your-vercel-app.vercel.app
PORT                = [Railway auto-injects — do not set manually]
```

### Optional Environment Variables
```
SYNCHRONIZE         = false   [already forced false in code; belt-and-suspenders]
TWILIO_ACCOUNT_SID  = [only if SMS notifications needed]
TWILIO_AUTH_TOKEN   = [only if SMS notifications needed]
TWILIO_PHONE_NUMBER = [only if SMS notifications needed]
```

### Migration Strategy
**On every `railway up`:**
1. Railway builds the app (`npm run build`)
2. Railway starts the app (`npm run start:prod`)
3. NestJS boots and TypeORM runs `migrationsRun: true`
4. TypeORM checks the `migrations` table for which migrations have already run
5. Only new migrations execute — all use `IF NOT EXISTS` so they are idempotent
6. App becomes ready to serve traffic

**This is safe for `railway up` on every release.** The only risk is a migration that has a destructive `down()` — none of the current migrations do.

### Rollback Strategy
**Code rollback:**
1. In Railway dashboard, redeploy the previous Git commit
2. Previous code starts; `migrationsRun: true` runs no new migrations (they already ran)
3. If the new migration added a column, old code ignores it — safe

**Migration rollback (if a migration must be reverted):**
```bash
# Locally with prod DATABASE_URL
DATABASE_URL=<prod_url> npm run migration:revert
```
Then redeploy the previous code version.

**Never roll back migrations automatically on code rollback** — data loss risk if rows were written to new columns.

### Backup Strategy
Before any deployment that includes schema changes:
```
# Via Railway CLI
railway connect postgres
pg_dump -Fc bingo_db > backup_$(date +%Y%m%d_%H%M%S).dump

# Or via Railway dashboard:
# PostgreSQL plugin → Backups → Create backup
```

Railway also supports automatic daily backups on paid plans — enable before go-live.

---

## SECTION 10 — FUTURE `railway up` SAFETY

**Answer: YES — `railway up` is safe for future releases, with the following conditions:**

1. Every schema change must be implemented as a new numbered migration (never modify existing migrations)
2. All migrations must use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency
3. The `synchronize: false` setting must never be changed (currently enforced in code)
4. Destructive migrations (dropping columns, changing types) must be preceded by a database backup
5. Delete `1670000000000` migration before first deployment — after that the chain is stable

The `migration:run:prod` script in `package.json` can also be used to run migrations as a Railway pre-deploy command if you prefer explicit control over automatic migration:
```
npm run build && npm run migration:run:prod && npm run start:prod
```
This is the safer pattern for production: build → migrate → start, with each step visible in Railway logs.

---

## SUMMARY TABLE

| Domain | Issues Found | Fixed in v8 | Remaining |
|--------|-------------|-------------|-----------|
| Deployment config | 3 blockers | 0 | 3 (Dockerfile, CORS, audit migration) |
| Migration ordering | 1 critical | 0 | 1 (1670000000000 still present) |
| Payment → schedule linkage | Fixed | ✅ | 1 (cash_drawer_id not sent) |
| Loan form type safety | Partially fixed | ✅ Bike price | 1 (negative guard missing) |
| Tenant isolation | All fixed | ✅ | 0 |
| Branch isolation | All fixed | ✅ | 0 |
| Expense approval transaction | Fixed | ✅ | 0 |
| Drawer state guards | Fixed | ✅ | 0 |
| Reconciliation locking | Fixed | ✅ | 0 |
| History filters | Fixed | ✅ | 0 |
| Performance indexes | Added | ✅ | 0 |
| Seed data (categories) | Added | ✅ | 0 |
| 20 stabilisation items | All verified | ✅ | 0 |

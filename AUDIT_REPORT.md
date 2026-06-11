# BINGO VINTAGE — DEEP STRUCTURAL AUDIT REPORT
**Date:** 2026-06-11 | **Codebase:** bingo_vintage_clean | **Scope:** Pre-deployment

---

## FINAL VERDICT

```
╔══════════════════════════════════════════════════════════════════╗
║  BLOCKED: FIX 6 CRITICAL ISSUES BEFORE PROCEEDING               ║
║                                                                   ║
║  Issues C1–C3 will cause immediate production crashes.            ║
║  Issues C4–C6 will cause silent data corruption or breakage.      ║
║  All are mechanical fixes — none require architectural changes.   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 1. CRITICAL ISSUES

### C1 — `AllExceptionFilter` is not registered globally
**File:** `backend/src/main.ts`
**Evidence:** `grep "AllExceptionFilter\|useGlobalFilters" main.ts` → no output.

The filter exists at `common/filters/all-exception.filter.ts` and handles TypeORM constraint codes, sanitises stack traces in production, and attaches `X-Request-Id` to error responses. None of this fires because it was never registered.

Without it, a PostgreSQL FK violation (`23503`) returns a raw 500 with an internal TypeORM stack trace to the client — leaking table names and column names.

**Fix:**
```typescript
// main.ts — after app creation
app.useGlobalFilters(new AllExceptionFilter());
```

---

### C2 — `RequestIdMiddleware` is not registered in `AppModule`
**File:** `backend/src/app.module.ts`
**Evidence:** `grep "RequestIdMiddleware\|configure\|NestModule" app.module.ts` → no output.

The middleware exists and attaches `req.requestId`. The `PaymentsService.create()` accepts `requestId` and threads it through all log lines. But since the middleware is never applied, `req.requestId` is always `undefined`. Every payment log line reads `[requestId=undefined]`.

**Fix:**
```typescript
// app.module.ts
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

---

### C3 — `frontend/src/page.tsx` is an orphaned file that will crash the Next.js build
**File:** `frontend/src/page.tsx`
**Evidence:** File contains a SettingsPage component but lives at `src/page.tsx`, not `app/page.tsx`. Next.js App Router expects pages inside `app/`. This file will either be ignored (best case) or cause a module resolution error during build.

The content is a stub Settings page — it is already correctly implemented at `app/dashboard/settings/page.tsx`. This is a leftover copy.

**Fix:** Delete `frontend/src/page.tsx`.

---

### C4 — `GET /payments` returns `{ items, nextCursor, count }` but every frontend consumer reads the root array
**Files:** `features/payments/PaymentsPage.tsx`, `app/dashboard/reversals/page.tsx`
**Evidence:**
```javascript
// PaymentsPage.tsx line ~525 — reads root array
const list: any[] = Array.isArray(data) ? data : data.data || data.payments || [];

// reversals/page.tsx — same pattern
setPayments(Array.isArray(data) ? data : data?.data || []);
```

The backend `payments.service.ts findAll()` now returns `{ items, nextCursor, count }`. Neither caller reads `.items`. Both fall through all branches and set `list = []`. The payments page will show zero payments and the reversals page will show zero pending reversals — permanently, with no error.

`GET /expenses` has the same problem — returns `{ items, nextCursor }` but the expenses page was not audited for `.items` reading (the page file was empty in audit output).

**Fix:** Update both pages to read `data.items ?? []` as the list source.

---

### C5 — Six NestJS modules present on disk but not registered in `app.module.ts`
**File:** `backend/src/app.module.ts`
**Evidence:** `BranchesModule`, `DashboardModule`, `LoanProductsModule`, `PermissionsModule`, `RolesModule`, `TenantsModule` — all have controllers, services, and entities but are absent from the `imports` array.

Consequences:
- `BranchesModule`: branch creation/editing returns 404 on all routes. Branch assignment is impossible from the UI.
- `DashboardModule`: dashboard metrics endpoint (`GET /api/dashboard/*`) returns 404.
- `TenantsModule`: admin cannot create users. The frontend settings page calls these endpoints.
- `RolesModule` + `PermissionsModule`: role/permission management returns 404.
- `LoanProductsModule`: loan products configuration returns 404.

**Fix:** Add all six modules to the `imports` array in `app.module.ts`.

---

### C6 — `LoanStatus` enum: `WRITTEN_OFF` and `DELINQUENT` mismatches across layers
**Evidence:**
- `shared/api-types.ts`: `LoanStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'DELINQUENT' | 'COMPLETED' | 'CANCELLED' | 'WRITTEN_OFF'`
- `backend/src/modules/enums/loan-status.enum.ts`: `PENDING | ACTIVE | COMPLETED | DEFAULTED | CANCELLED` — **missing `PENDING_APPROVAL`, `DELINQUENT`, no `WRITTEN_OFF`**
- `backend/src/modules/loans/entities/loan.entity.ts` inline enum: has `PENDING_APPROVAL`, `DELINQUENT`, `DEFAULTED` — **matches DB DDL**
- DB DDL (`FoundationSchema`): `'PENDING', 'PENDING_APPROVAL', 'ACTIVE', 'DELINQUENT', 'COMPLETED', 'DEFAULTED', 'CANCELLED'`

The standalone `enums/loan-status.enum.ts` file is a stale duplicate that is wrong. Any import of `LoanStatus` from this file will use incorrect values — particularly `PENDING` instead of `PENDING_APPROVAL` for new loans.

`WRITTEN_OFF` is in `shared/api-types.ts` but not in the DB enum. Writing `WRITTEN_OFF` to a loan status column will throw: `invalid input value for enum loan_status_enum: "WRITTEN_OFF"`.

`ScheduleStatus` has the same problem: `PARTIALLY_PAID` in the enum file vs `PARTIAL` in the DB.

**Fix:**
1. Delete `backend/src/modules/enums/loan-status.enum.ts` and `schedule-status.enum.ts` — or align them with the entity enums.
2. Remove `WRITTEN_OFF` from `shared/api-types.ts` until a migration adds it to the DB enum.
3. Change `PARTIALLY_PAID` → `PARTIAL` in `ScheduleStatus`.

---

## 2. HIGH-PRIORITY WARNINGS

### H1 — `prisma/schema.prisma` conflicts with TypeORM in the same project
**File:** `backend/prisma/schema.prisma`
**Evidence:** File exists with a Prisma data model. The project uses TypeORM exclusively. Prisma's schema references different field names (`loan_amount` vs `principal_amount`, no `balance` field). If anyone runs `prisma db push` or `prisma migrate`, it will destructively alter the schema.

**Fix:** Delete `backend/prisma/schema.prisma` and the `prisma/` directory entirely.

---

### H2 — `applyBike` in `loan.api.ts` still calls `/loans/apply` with untyped payload
**File:** `frontend/src/features/loans/loan.api.ts`
**Evidence:**
```typescript
applyBike:  (payload: any) => api.post('/loans/apply', payload),
```
This was fixed in earlier sessions to use `/loans/create-bike-loan`, but the fix was lost. The create wizard calls the correct endpoint directly via raw `apiFetch`, so the wizard works. Any code using `loanApi.applyBike()` calls the wrong endpoint with an `any` payload.

**Fix:** Change to:
```typescript
applyBike: (data: CreateBikeLoanRequest) => api.post('/loans/create-bike-loan', {
  client_id: data.clientId, bike_id: data.bikeId, deposit: data.deposit,
  term_weeks: data.termWeeks, interest_rate: data.interestRate ?? 0,
  principal_amount: data.principalAmount, weekly_installment: data.weeklyInstallment,
  notes: data.notes,
})
```

---

### H3 — `payments.types.ts` still imported by 3 components after redirect
**Files:** `RepaymentModal.tsx`, `PaymentSummary.tsx`, `PaymentsTable.tsx`
**Evidence:** All three import `{ Payment }` or `{ PaymentMethod }` from `../payments.types`. That file was redirected to `shared/api-types` but the components were not updated. They compile against the old local type — missing `reversal_status`, `cash_drawer_id`, and other new fields. TypeScript will not catch this until `payments.types.ts` is deleted.

**Fix:** Update all three imports to `from '@/shared/api-types'`.

---

### H4 — Four parallel type systems with conflicting definitions
**Evidence (file inventory):**
- `frontend/src/shared/api-types.ts` — canonical (new)
- `frontend/src/contract/api.ts` — another full contract file (old)
- `frontend/src/types/loan.ts`, `types/api.ts`, `types/bike.ts`, `types/user.ts` — yet another set
- `frontend/src/lib/api/types.ts` — fourth set (Client type)
- `frontend/src/features/*/**.types.ts` — feature-local types

`contract/api.ts` defines `Loan` with `EntityId` (a string union type). `shared/api-types.ts` defines `Loan` with `id: number`. If any import resolves to `contract/api.ts`, code that does arithmetic on `loan.id` will silently produce `NaN`.

**Fix:** Delete `contract/api.ts`, `types/loan.ts`, `types/api.ts`, `types/bike.ts`, `types/user.ts`, and `lib/api/types.ts`. Redirect all imports to `shared/api-types.ts`. This is medium-effort but eliminates the type system fragmentation that makes contract violations invisible.

---

### H5 — `sanitiseDto` not applied to `expenses.service.ts`
**Evidence:** `grep "sanitise" expenses.service.ts` → no output.

Payment create has `sanitiseDto` applied. Expense description and notes do not. A user could store HTML in an expense description that renders in the approval panel or a PDF receipt.

**Fix:** Add `const dto = sanitiseDto(rawDto)` at entry of `expenses.service.create()`.

---

### H6 — `LoanType` enum case mismatch between `loan.types.ts` and `shared/api-types.ts`
**Evidence:**
- `shared/api-types.ts`: `LoanType = 'cash' | 'bike'` (lowercase — matches what backend accepts)
- `features/loans/loan.types.ts`: `LoanType = "BIKE" | "CASH"` (uppercase — wrong)

`BaseLoan.loan_type` uses the local file's uppercase values. Any component importing from `loan.types.ts` and sending `loan_type: "BIKE"` to the backend will get a validation failure because `@IsEnum(LoanType)` expects `'bike'`.

**Fix:** Either delete `loan.types.ts` and replace with `shared/api-types.ts`, or update it to match lowercase.

---

## 3. NAMING & ORGANISATION ISSUES

### N1 — Migration numbering gap at 009 and 010
Migrations jump from `...008` to `...011`. Gaps suggest two migrations were created and deleted. This is not harmful (TypeORM tracks by class name, not sequence position) but creates confusion when numbering future migrations. Document the gap in `database/migrations/README.md`.

### N2 — DTOs misplaced in `tenants` module root
`backend/src/modules/tenants/create-user.dto.ts`, `change-password.dto.ts`, `update-user.dto.ts` sit in the module root, not in a `dto/` subdirectory. All other modules use `dto/`. Move them to `tenants/dto/` for consistency.

### N3 — Duplicate `roles.decorator.ts`
`backend/src/modules/auth/decorators/roles.decorator.ts` and `backend/src/modules/common/decorators/roles.decorator.ts` both exist. Two files, same name, unclear which is canonical. Likely causes the wrong one to be imported in different places.

### N4 — `backend/src/modules/uploads/supabase.service.ts` has no module
The service has no corresponding `uploads.module.ts`, is not registered anywhere, and reads `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_KEY` which are not in `.env.example`. Either delete it or create the module and document the env vars.

---

## 4. COMPATIBILITY GAPS

### G1 — `ScheduleStatus.PARTIAL` vs `PARTIALLY_PAID`
- DB enum (`FoundationSchema`): `'PARTIAL'`
- `shared/api-types.ts` `ScheduleStatus`: `'PARTIAL'` ✅
- `backend/src/modules/enums/schedule-status.enum.ts`: `PARTIALLY_PAID = 'PARTIALLY_PAID'` ✗

Any service using the enum file to write schedule status will write `'PARTIALLY_PAID'` to the DB, which will throw a PostgreSQL enum violation.

### G2 — `shared/api-types.ts` Loan interface missing `loanNumber`
The backend `Loan` entity exposes `loan_number` via a getter. The `shared/api-types.ts` `Loan` interface has `loan_number` but the `BaseLoan` in `loan.types.ts` (still used by some components) does not. Any component referencing `loan.loanNumber` will get `undefined`.

### G3 — `PaymentStatus` missing `REVERSAL_REQUESTED` in shared types
- Backend enum: `REVERSAL_REQUESTED = 'REVERSAL_REQUESTED'`
- `shared/api-types.ts`: `PaymentStatus = 'COMPLETED' | 'REVERSED' | 'PENDING' | 'FAILED'`

Missing `REVERSAL_REQUESTED`. The reversals page filters by payment status and will not match payments in this state.

### G4 — `expenses.service.ts findAll()` returns `{ items, nextCursor }` — missing `count`
- `payments.service.ts findAll()` returns `{ items, nextCursor, count }`
- `expenses.service.ts findAll()` returns `{ items, nextCursor }` (no `count`)
- `shared/api-types.ts PaginatedResponse` includes `count: number`

The `expenses.service` return type does not match `PaginatedResponse<Expense>`. Callers expecting `.count` will get `undefined`.

---

## 5. BUILD & DEPLOYMENT READINESS

| Check | Status | Notes |
|-------|--------|-------|
| `backend/package.json build` = `nest build` | ✅ | Correct |
| `backend/package.json start:prod` = `node dist/main` | ✅ | Correct |
| `frontend/package.json build` = `next build` | ✅ | Correct |
| `backend/tsconfig.json strict` | ✗ | `strict` not set — implicit `any` not caught at compile time |
| `frontend/tsconfig.json strict` | ✗ | `strict: false` — same |
| `AllExceptionFilter` registered | ✗ | **C1** — not registered |
| `RequestIdMiddleware` registered | ✗ | **C2** — not registered |
| 6 modules registered in AppModule | ✗ | **C5** — branches, dashboard, tenants, roles, permissions, loan-products missing |
| Orphaned `src/page.tsx` | ✗ | **C3** — will interfere with build |
| Prisma schema alongside TypeORM | ✗ | **H1** — destructive if run |
| CI runs real PostgreSQL | ✅ | `postgres:15-alpine` |
| CI runs `migration:run:prod` | ✅ | Correct |
| CI type-checks frontend | ✅ | `tsc --noEmit` |
| `backend/.env.example` present | ✅ | Present |
| `frontend/.env.example` present | ✅ | Present |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` in `.env.example` | ✗ | Missing |
| `helmet()` active | ✅ | `main.ts` |
| `ValidationPipe forbidNonWhitelisted` | ✅ | `main.ts` |
| Auth throttled (5 login/3 register per min) | ✅ | `auth.controller.ts` |
| `POST /payments` throttled (10/min) | ✅ | `payments.controller.ts` |
| Pessimistic lock on payment create | ✅ | `SELECT...FOR UPDATE` |
| `getPortfolioSummary` tenant-scoped | ✅ | `WHERE tenant_id = $1` |
| `getPendingReversalRequests` uses `reversalStatus` | ✅ | Typed enum column |
| Migration 017 `down()` drops column + type | ✅ | Correct |
| `sanitiseDto` on payment create | ✅ | Applied |
| `sanitiseDto` on expense create | ✗ | **H5** — missing |

---

## FIX PRIORITY ORDER

```
Immediate (will prevent deploy or cause silent data loss):
  1. C4 — PaymentsPage + reversals/page.tsx read .items not root array
  2. C1 — Register AllExceptionFilter in main.ts
  3. C2 — Register RequestIdMiddleware in app.module.ts
  4. C3 — Delete frontend/src/page.tsx
  5. C5 — Register 6 missing modules in app.module.ts
  6. C6 — Fix LoanStatus/ScheduleStatus enums, remove WRITTEN_OFF from shared types

Before first real user:
  7. H1 — Delete prisma/ directory
  8. H2 — Fix applyBike endpoint
  9. H3 — Update 3 components to import from shared/api-types
  10. G1 — Fix PARTIALLY_PAID → PARTIAL
  11. G3 — Add REVERSAL_REQUESTED to PaymentStatus in shared/api-types
  12. G4 — Add count to expenses findAll return
  13. H5 — Apply sanitiseDto to expenses.service.create()

Post-launch cleanup:
  14. H4 — Delete 4 duplicate type files, consolidate into shared/api-types
  15. H6 — Delete loan.types.ts or align LoanType case
  16. N2/N3/N4 — Move misplaced DTOs, remove duplicate decorator, handle uploads module
```

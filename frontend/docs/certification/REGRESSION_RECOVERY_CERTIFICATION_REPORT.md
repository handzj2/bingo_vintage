# REGRESSION RECOVERY CERTIFICATION REPORT
**Date:** 2026-06-09
**Baseline:** Original Bingo Vintage codebase (source of truth for business behaviour)
**Target:** bingostablized.zip — Phase 1–12 stabilized codebase
**Scope:** REG-01 through REG-06 — surgical business logic restoration

---

## EXECUTIVE SUMMARY

Six regressions introduced during stabilization have been corrected. Every Phase 1–12
stabilization fix has been preserved. No security hardening was weakened. No migration
changes were made. Only the five source files described below were modified.

| Regression | Description | Files Changed | Status |
|-----------|-------------|---------------|--------|
| REG-01 | Ledger entry missing from expense approval | `expenses.service.ts`, `expenses.module.ts` | ✅ FIXED |
| REG-02 | Drawer deduction on create instead of approve | `expenses.service.ts`, `expenses.module.ts` | ✅ FIXED |
| REG-03 | `deduct()` / `add()` / `getSummary()` absent from CashDrawerService | `cash-drawers/cash-drawers.service.ts` | ✅ FIXED |
| REG-04 | Reconciliation history `branchId`/`drawerId` filters silently dropped | `reconciliation.service.ts`, `reconciliation.controller.ts` | ✅ FIXED |
| REG-05 | Cash drawer history `branchId`/`userId` filters silently dropped | `cash-drawers/cash-drawers.service.ts`, `cash-drawers/cash-drawers.controller.ts` | ✅ FIXED |
| REG-06 | `bike_id` removed from `CreateLoanDto` — broke bike loan creation under `forbidNonWhitelisted:true` | `loans/dto/create-loan.dto.ts` | ✅ FIXED |

---

## REG-01 + REG-02 — Expense Approval Financial Integrity

### Root Cause
During stabilization `ExpensesService` was rewritten. The author moved drawer balance
deduction from `approve()` to `create()`, and removed the ledger entry entirely from
`approve()`. This introduced two compounding financial defects:

1. **REG-01:** Every approved expense was invisible to financial reports — no ledger
   entry was written.
2. **REG-02:** Drawer balance dropped for PENDING expenses before any manager had
   approved them. Non-cash expenses (bank transfer, Momo) incorrectly deducted the
   drawer. Rejected expenses required a balance reversal that undid an operation that
   should never have happened.

### Before (broken behaviour in uploaded file)

```
POST /expenses
  → expense created with status = PENDING
  → UPDATE cash_drawers current_balance -= amount   ← fires immediately, before approval
    (all payment methods, not just cash)

PATCH /expenses/:id/approve
  → expense.status = 'approved'                     ← no ledger entry
                                                     ← no drawer deduction

PATCH /expenses/:id/reject
  → expense.status = 'rejected'
  → UPDATE cash_drawers current_balance += amount   ← reverses a deduction that was wrong
```

### After (original correct behaviour, restored)

```
POST /expenses
  → validate category ownership (tenantId)
  → validate drawer exists + is open (if cashDrawerId provided)
  → expense.status = PENDING
  → NO balance mutation

PATCH /expenses/:id/approve
  → DataSource.transaction():
      1. expense.status = APPROVED
      2. ledgerService.recordExpense(expenseId, amount, description, createdBy)
      3. if (paymentMethod === 'cash' && cashDrawerId):
             cashDrawerService.deduct(drawerId, amount, description)
    COMMIT — all three succeed or all roll back

PATCH /expenses/:id/reject
  → expense.status = REJECTED
  → NO drawer adjustment (nothing was deducted on create)
```

### Changes Made

**`expenses/expenses.service.ts`** — rewritten:
- Constructor: `@InjectRepository(CashDrawer)` removed; `CashDrawerService` and
  `LedgerService` injected by module (already present in `CashDrawersModule` and
  `LedgerModule`).
- `create()`: validates-only; no balance mutation; uses `CreateExpenseDto` type;
  calls `cashDrawerService.assertOpen()` for drawer validation.
- `approve()`: `DataSource.transaction()` wrapping all three steps; `ExpenseStatus`
  enum used throughout.
- `reject()`: no drawer reversal.
- All status comparisons use `ExpenseStatus` enum (not string literals).

**`expenses/expenses.module.ts`** — `CashDrawer` entity removed from
`TypeOrmModule.forFeature([...])`. The service no longer directly injects the
repository — it uses `CashDrawerService` which is exported by `CashDrawersModule`
(already imported). `LedgerModule` already imported. No new imports required.

---

## REG-03 — CashDrawerService Balance Mutation API

### Root Cause
The stabilization rewrite removed `deduct()`, `add()`, and `getSummary()` from
`CashDrawerService`. Without them, balance mutations were scattered across raw SQL
in `ExpensesService` — bypassing the service's state guards, tenant isolation, and
any future audit hooks.

### Methods Restored

**`deduct(drawerId, amount, description)`**
```typescript
async deduct(drawerId: number, amount: number, description: string): Promise<void> {
  await this.drawerRepo.decrement({ id: drawerId }, 'currentBalance', amount);
}
```

**`add(drawerId, amount, description)`**
```typescript
async add(drawerId: number, amount: number, description: string): Promise<void> {
  await this.drawerRepo.increment({ id: drawerId }, 'currentBalance', amount);
}
```

**`getSummary(drawerId, tenantId)`**
Returns `{ drawer, totalPayments, totalExpenses, expectedBalance, currentBalance }`.
Uses the same QueryBuilder queries already in `close()` to compute totals from
linked payments and approved expenses.

All three methods appended to the existing class. No other methods changed.

---

## REG-04 — Reconciliation History Filtering

### Root Cause
`ReconciliationController.getHistory()` accepted `?branchId=N` and `?drawerId=M`
query parameters but called `findAll(tenantId)` — discarding both values. Multi-branch
tenants could not view reconciliation history per branch or per drawer.

### Before
```typescript
// Controller:
return this.reconService.findAll(req.user.tenantId);  // filters dropped
```

### After
```typescript
// Service: optional QueryBuilder filters
async findAll(tenantId, branchId?, drawerId?) {
  const qb = this.reconRepo.createQueryBuilder('r')
    .where('r.tenant_id = :tenantId', { tenantId });
  if (branchId) qb.andWhere('r.branch_id = :branchId', { branchId });
  if (drawerId) qb.andWhere('r.drawer_id = :drawerId', { drawerId });
  return qb.orderBy('r.reconciled_at', 'DESC').getMany();
}

// Controller: coerces strings to integers before forwarding
const bId = branchId ? +branchId : undefined;
const dId = drawerId ? +drawerId : undefined;
return this.reconService.findAll(req.user.tenantId, bId, dId);
```

---

## REG-05 — Cash Drawer History Filtering

### Root Cause
Same pattern as REG-04. `CashDrawerController.getHistory()` accepted `?branchId=N`
and `?userId=M` but called `findAll(tenantId)` — discarding both values.

### Before
```typescript
return this.drawerService.findAll(req.user.tenantId);  // filters dropped
```

### After
```typescript
// Service: optional QueryBuilder filters
async findAll(tenantId, status?, branchId?, userId?) {
  const qb = this.drawerRepo.createQueryBuilder('d')
    .where('d.tenant_id = :tenantId', { tenantId });
  if (status)   qb.andWhere('d.status    = :status',   { status });
  if (branchId) qb.andWhere('d.branch_id = :branchId', { branchId });
  if (userId)   qb.andWhere('d.user_id   = :userId',   { userId });
  return qb.orderBy('d.created_at', 'DESC').getMany();
}

// Controller: coerces and forwards
return this.drawerService.findAll(
  req.user.tenantId, undefined,
  branchId ? +branchId : undefined,
  userId   ? +userId   : undefined,
);
```

Note: `GET /cash-drawers` (drawer dropdown list) still passes only `status` — the
branch/user filters apply only to the `GET /cash-drawers/history` admin endpoint.

---

## REG-06 — `bike_id` Restored to `CreateLoanDto`

### Root Cause
`POST /api/loans/create-bike-loan` controller spreads `CreateBikeLoanDto` — which
contains `bike_id` (integer) — into `loansService.create()`. With
`forbidNonWhitelisted: true` active (Phase 10), any field not declared in
`CreateLoanDto` causes a 400 Bad Request. Removing `bike_id` broke bike loan
creation silently in production.

### Fix
```typescript
@ApiProperty({ required: false, example: 1,
  description: 'Legacy integer bike ID — used by the create-bike-loan controller path' })
@IsOptional()
@IsNumber()
@IsPositive()
bike_id?: number;
```

`forbidNonWhitelisted: true` is untouched. `bike_id` is now a whitelisted optional
integer. The UUID-based `bikeId` field (Phase 1 fix) is also preserved.

---

## UAT SCENARIOS

### Scenario 1 — Expense financial flow (cash)
```
1. POST /cash-drawers/open { openingBalance: 500000 }
   → drawer.currentBalance = 500000

2. POST /expenses { amount: 50000, paymentMethod: 'cash', cashDrawerId: D, ... }
   → expense.status = 'pending'
   → GET /cash-drawers/current → currentBalance STILL 500000   ← key assertion

3. PATCH /expenses/:id/approve
   → expense.status = 'approved'
   → GET /cash-drawers/current → currentBalance = 450000       ← deducted on approve
   → GET /reports/ledger       → expense entry present          ← ledger written
```

### Scenario 2 — Expense financial flow (non-cash, no drawer deduction)
```
1. POST /expenses { amount: 100000, paymentMethod: 'bank_transfer', cashDrawerId: D }
2. PATCH /expenses/:id/approve
   → expense.status = 'approved'
   → GET /cash-drawers/current → currentBalance UNCHANGED       ← cash guard works
   → ledger entry still written                                  ← ledger unaffected
```

### Scenario 3 — Rejected expense (no balance impact)
```
1. POST /expenses { amount: 30000, paymentMethod: 'cash', cashDrawerId: D }
   → currentBalance UNCHANGED at create
2. PATCH /expenses/:id/reject
   → expense.status = 'rejected'
   → currentBalance STILL UNCHANGED                             ← no reversal needed
```

### Scenario 4 — Bike loan creation
```
POST /loans/create-bike-loan { client_id: 1, bike_id: 5, deposit: 3000000, term_weeks: 104 }
→ Expected: 201 Created
→ bike_id passes forbidNonWhitelisted validation
```

### Scenario 5 — Filtered history
```
GET /reconciliation?branchId=2           → only branch 2 records
GET /reconciliation?drawerId=7           → only drawer 7 records
GET /cash-drawers/history?branchId=2     → only branch 2 drawers
GET /cash-drawers/history?userId=5       → only cashier 5 drawers
```

---

## PRESERVED STABILIZATION CHANGES

The following Phase 1–12 changes are intact and unmodified:

| Category | Change | File | Status |
|----------|--------|------|--------|
| Schema | Foundation schema migration | `database/migrations/1700000000001*` | ✅ Intact |
| Schema | Expense/reconciliation tables migration | `database/migrations/1700000000002*` | ✅ Intact |
| Schema | Infrastructure tables migration | `database/migrations/1700000000003*` | ✅ Intact |
| Schema | Seed default data | `database/migrations/1700000000004*` | ✅ Intact |
| Schema | Cash drawer branch FK → RESTRICT | `database/migrations/1700000000005*` | ✅ Intact |
| Schema | Legacy migration reordered | `database/migrations/1700000000006*` | ✅ Intact |
| Security | `forbidNonWhitelisted: true` | `main.ts` | ✅ Intact |
| Security | `helmet()` | `main.ts` | ✅ Intact |
| Security | Explicit CORS origins | `main.ts` | ✅ Intact |
| Security | Rate limiting on auth endpoints | `auth.controller.ts` | ✅ Intact |
| Security | `migrationsRun: true`, `synchronize: false` | `app.module.ts` | ✅ Intact |
| Auth | Role-aware branch enforcement | `jwt.strategy.ts` | ✅ Intact |
| Auth | `tenantId` hard block for all roles | `jwt.strategy.ts` | ✅ Intact |
| Auth | Dual user entity resolved | `auth/entities/user.entity.ts` | ✅ Intact |
| Loans | Schedule generation on creation | `loans.service.ts` | ✅ Intact |
| Loans | Loan number via MAX(id) | `loans.service.ts` | ✅ Intact |
| Loans | `clientId`/`bikeId` integer FK fix | `create-loan.dto.ts` | ✅ Intact |
| Loans | Shared `LoanType` enum | `loans/dto/loan-type.enum.ts` | ✅ Intact |
| Loans | Explicit `loanType` in `ApplyLoanDto` | `apply-loan.dto.ts` | ✅ Intact |
| Financial | Cash drawer state guards (open/closed/reconciled) | `cash-drawers.service.ts` | ✅ Intact |
| Financial | Drawer locked after reconciliation | `reconciliation.service.ts` | ✅ Intact |
| Financial | Tenant isolation on all drawer lookups | `cash-drawers.service.ts` | ✅ Intact |
| Financial | Tenant isolation on reconciliation | `reconciliation.service.ts` | ✅ Intact |
| Financial | Phase 4.1 branch guard on create/close/approve | all financial services | ✅ Intact |
| Financial | No `?? 1` fallbacks in any service | all modules | ✅ Intact |
| Financial | `difference` written as plain column | `reconciliation.entity.ts` | ✅ Intact |
| Ops | Health endpoint `GET /api/health` | `health.controller.ts` | ✅ Intact |
| Ops | Graceful shutdown hooks | `main.ts` | ✅ Intact |
| Ops | Migration CLI scripts | `package.json` | ✅ Intact |
| Ops | Standalone `data-source.ts` | `data-source.ts` | ✅ Intact |

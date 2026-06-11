# BINGO VINTAGE — CODE QUALITY & DEPLOYMENT SIMULATION REPORT
**Date:** 2026-06-11 | **Codebase:** bingo_vintage_clean

---

## OVERALL VERDICT

```
╔══════════════════════════════════════════════════════════════════╗
║  PRODUCTION-VIABLE WITH KNOWN RISKS                               ║
║                                                                   ║
║  The system will function correctly under normal load for a       ║
║  single-branch deployment. Two structural issues will cause        ║
║  real money errors under concurrent load or business growth.      ║
║  Neither will appear in testing. Both will appear in production.  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## PART 1 — WHAT IS DONE WELL

**Security posture is solid.**
`helmet()`, compression, `ValidationPipe` with `forbidNonWhitelisted: true`, rate limiting on auth (5 attempts/60s for login, 3 for register), JWT secret validated at startup, Swagger disabled in production, CORS origin allowlist from env. These are not trivial — most internal tools skip half of them.

**Payment reversal is genuinely correct.**
`reversePayment()` uses `queryRunner.startTransaction()` → pessimistic write lock → update loan balance → revert bike status → mark payment reversed → revert schedule → `commitTransaction()`. The lock prevents concurrent reversals on the same payment. This is production-quality transactional code.

**Idempotency on payment submission.**
`idempotencyKey` is checked before processing and on the unique constraint catch. Double-submitting the same payment returns the existing record without creating a duplicate charge. This is a real-world requirement that most small systems miss entirely.

**Loan lifecycle is complete and correct.**
`PENDING_APPROVAL → ACTIVE → COMPLETED` with schedule generation at creation, arrears job at 02:00 UTC daily, overdue promotion at midnight, bike status transitions on loan completion. The state machine is coherent.

**Migration chain is safe for `railway up`.**
14 migrations, strict timestamp order, all use `IF NOT EXISTS` / `IF EXISTS` guards. `synchronize: false`, `migrationsRun: true`. Rolling forward on every deploy is safe. Rolling back requires manual intervention, which is the correct posture for a financial system.

**Expense approval transaction is correct.**
`dataSource.transaction()` wraps approve + ledger entry + drawer deduction as a single atomic unit. Non-cash expenses skip the drawer deduction. Rejection does not touch the drawer (because nothing was deducted on create). This matches the correct accounting model.

---

## PART 2 — CRITICAL PRODUCTION RISKS

### RISK 1 — Payment creates a TOCTOU race condition on loan balance
**Severity: HIGH | Will cause data loss under concurrent load**

**File:** `payments/payments.service.ts` lines 218–223

```typescript
// OUTSIDE any transaction:
const newBalance = Math.max(0, Number(loan.balance) - Number(dto.amount));
await this.loanRepo.update(dto.loanId, { balance: newBalance });
```

The loan balance is read at line 173 (`findOne`), then written back at line 218. These are two separate database round-trips with no lock between them. If two cashiers submit a payment for the same loan within the same second — which happens routinely in a busy branch — both reads return the same old balance, both compute `oldBalance - amount`, and one update overwrites the other. The loan balance ends up wrong.

**What will happen in production:** On a day when two tellers are collecting from the same borrower — for a partial payment and a missed installment — one payment will vanish from the balance. The loan will appear to have a higher outstanding balance than it should. This will only be discovered at reconciliation, will be blamed on cashier error, and will take hours to trace.

**Contrast with reversal code** — which does this correctly using `queryRunner.setLock('pessimistic_write')`.

**Fix required:**
```typescript
// payment creation must use the same transactional pattern as reversal
const queryRunner = this.connection.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
try {
  const loan = await queryRunner.manager
    .createQueryBuilder(Loan, 'loan')
    .where('loan.id = :id', { id: dto.loanId })
    .setLock('pessimistic_write')
    .getOne();
  // ... rest of payment logic inside this transaction
  await queryRunner.commitTransaction();
} catch (e) {
  await queryRunner.rollbackTransaction();
  throw e;
} finally {
  await queryRunner.release();
}
```

---

### RISK 2 — `getPortfolioSummary` has no tenant filter
**Severity: HIGH | Cross-tenant financial data visible**

**File:** `loans/loans.service.ts` `getPortfolioSummary()`

```typescript
// Raw SQL with NO WHERE tenant_id = $1:
const rows = await this.loansRepo.manager.query(`
  SELECT
    COUNT(*) AS total_loans,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_loans,
    COALESCE(SUM(balance), 0) AS total_outstanding,
    COALESCE(SUM(total_amount), 0) AS total_disbursed
  FROM loans
  -- ← no tenant filter
`);
```

The dashboard summary card showing "Total Outstanding" and "Total Disbursed" aggregates every loan in the database across every tenant. If you add a second tenant (a second branch office or business unit), their numbers appear in your dashboard.

`getOverdueLoansReport()` also has no tenant filter — returns all tenants' delinquent loans.

---

### RISK 3 — `payments.service.ts findAll()` returns all payments without pagination
**Severity: MEDIUM | Will cause timeout/OOM at scale**

```typescript
async findAll(tenantId?: number) {
  return this.paymentRepo.find({
    where,
    relations: ['loan', 'loan.client'],  // ← eager loads all relations
    order: { paymentDate: 'DESC' },
    // ← no take/skip
  });
}
```

With 1,000 loans and 12 monthly payments each, `findAll()` returns 12,000 payment objects with fully loaded loan and client relations. At 2 years of operation, a busy branch with 200 loans has ~5,000 payments. The response payload will be multiple megabytes. The Railway instance (512MB RAM on starter plan) will OOM. The request will timeout before that.

`expenses.service.ts` has `take: 500` as a hardcoded cap — better, but still not paginated. `findAll()` in payments, `getSummary()` in payments, `findByDateRange()` — none have pagination.

---

### RISK 4 — Hardcoded policy reference string throughout codebase
**Severity: LOW-MEDIUM | Operational/compliance risk**

```typescript
// Appears 14+ times across loans.controller, payments.service, reversal flow:
policyReference: '2026-01-10'
reversedBy: adminUser.email,
description: `Policy [2026-01-10]. Reason: ${reason}`
```

`2026-01-10` is a hardcoded date string used as a policy identifier. When this policy is updated or replaced, this string is scattered across 5+ files and will be missed in at least one place. More importantly, using a static string as a `policyReference` column value means the `getPendingReversalRequests()` query:

```typescript
where: { policyReference: 'REVERSAL_PENDING' } as any
```

...will silently break if any future change to this field's semantics happens. It is using a data column as a state machine flag.

---

## PART 3 — CODE QUALITY FINDINGS

### Type Safety: 28 `any` usages in financial paths

```
payments.service.ts:  rows: any[], loan: any, payment: any (in reversal)
loans.service.ts:     flipped: any[], data: ApplyLoanDto + (data as any).loanType
```

The `reversePayment()` function declares `let payment: any` and `let loan: any` after retrieving them from a typed query. This means TypeScript provides zero help if a field is renamed or removed from the entity. A refactor that renames `loan.bikeId` to `loan.bike_id` will compile without errors but crash at runtime.

The `(data as any).loanType` cast in `applyForLoan` is particularly fragile — it bypasses the DTO type system for the most important field in the loan creation flow.

### Frontend: 69 raw `apiFetch` calls, zero error boundaries

Every page calls `apiFetch()` and most catch errors into a `setError()` state. But there are no React Error Boundaries anywhere in the application. If an unhandled JavaScript error occurs during render — not an API error, but a null reference or type mismatch — the entire page goes blank with no feedback. The user sees a white screen with no message.

**No loading skeletons.** The payments page fetches loans, then schedules, then renders. During the fetch window, the UI shows empty dropdowns. Users frequently re-submit because they assume nothing loaded.

### Backend: Global throttle too permissive

```typescript
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])  // 100 req/min globally
```

Auth login is correctly throttled at 5/min. But financial mutation endpoints (`POST /payments`, `POST /expenses`, `POST /reconciliation`) have the 100/min global limit. A misconfigured frontend retry loop could submit 100 duplicate payment attempts per minute before being blocked — protected only by the idempotency key, which the frontend does not always send.

### Missing: Input sanitisation on text fields

`notes`, `description`, `reason`, `collectedBy` fields go directly from DTO into database and into SMS messages. They pass `@IsString()` validation but are never sanitised. An XSS payload in a `notes` field will be stored in the database, sent in an SMS, and rendered in the frontend. The frontend renders notes fields without escaping.

---

## PART 4 — DEPLOYMENT SIMULATION

### Scenario A: Normal first deployment (single tenant, 3 staff)

```
RESULT: ✅ WORKS CORRECTLY

Flow:
1. Admin logs in — JWT issued correctly
2. Admin creates branch → assigns cashier
3. Cashier logs in — branch guard passes
4. Client created → loan created (PENDING_APPROVAL)
5. Admin approves → status ACTIVE
6. Cashier opens drawer → current_balance = 500,000
7. Cashier records payment → schedule[0].status = PAID ✅
8. Cashier creates expense (cash) → drawer unchanged ✅
9. Admin approves expense → drawer.current_balance -= amount ✅
10. Cashier closes drawer → reconciliation created ✅

No failures at this traffic level.
```

---

### Scenario B: Two cashiers collecting from the same borrower simultaneously

```
RESULT: ❌ DATA CORRUPTION — TOCTOU race on loan balance

Timeline:
T=0ms    Cashier A: reads loan.balance = 100,000
T=5ms    Cashier B: reads loan.balance = 100,000
T=10ms   Cashier A: saves payment 30,000, updates balance to 70,000
T=15ms   Cashier B: saves payment 40,000, updates balance to 60,000  ← WRONG
                                                                        should be 30,000

Actual outcome:
  payments table: two rows totalling 70,000
  loans.balance:  60,000  ← wrong (should be 30,000)
  Discrepancy:    30,000  ← Cashier A's payment lost from balance
  
Probability: LOW at launch (small team), HIGH at scale (multiple branches)
Detection: Only at monthly reconciliation
Impact: Real money — borrower's balance appears higher than it is
```

---

### Scenario C: 1,000 loans, 2 years of payments — dashboard load

```
RESULT: ⚠️ TIMEOUT on payments page

Assumptions:
  1,000 loans × 12 monthly payments = 12,000 payment rows
  Each with loan + client relation loaded (3 DB queries per row at worst)
  
What happens:
  GET /api/payments → findAll() → no pagination
  → SELECT * FROM payments JOIN loans JOIN clients
  → 12,000 rows × ~500 bytes each = ~6MB response
  → Railway starter plan: 512MB RAM
  → TypeORM hydrating 12,000 entities with relations: ~120MB RAM spike
  → Response time: 8–15 seconds on Railway starter
  → Vercel serverless timeout: 10 seconds
  → Frontend shows "Failed to load payments" ← user sees failure, retries

GET /api/loans/reports/summary → getPortfolioSummary()
  → Aggregates ALL tenants (if multi-tenant)
  → Returns wrong numbers from day 1 of second tenant
```

---

### Scenario D: Railway restart (auto-migration)

```
RESULT: ✅ WORKS CORRECTLY

1. Railway pulls new commit
2. npm run build → nest build → dist/ compiled
3. node dist/main starts
4. TypeORM checks migrations table
5. Pending migrations run in order (IF NOT EXISTS guards make it idempotent)
6. App serves traffic

Constraint: If a migration is destructive (DROP COLUMN without IF EXISTS),
a failed migration leaves the app in a crashed loop.
Current migrations: all safe, all idempotent.
```

---

### Scenario E: JWT_SECRET missing from Railway env

```
RESULT: ❌ IMMEDIATE CRASH ON STARTUP

JwtStrategy constructor:
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');

The app throws on bootstrap. Railway shows "Build succeeded, Deploy failed."
Health check never responds. Railway retries 3 times then marks service down.
Frontend shows "Service Unavailable" to all users.

This is actually correct behaviour — failing fast on missing config is better
than silently issuing JWTs with an empty secret. But it means deployment fails
silently if the env var is forgotten.
```

---

### Scenario F: Vercel deploy with NODE_ENV=production (no API URL set)

```
RESULT: ⚠️ FRONTEND BUILDS BUT ALL API CALLS FAIL SILENTLY

next.config.js rewrites:
  if (apiUrl) → rewrites /api/* to Railway URL   ← requires NEXT_PUBLIC_API_URL
  if (isDevelopment) → rewrites to localhost
  else → return []  ← NO rewrites in production without API URL

If NEXT_PUBLIC_API_URL is not set in Vercel:
  All /api/* calls go to Vercel's own server
  Vercel returns 404 for every /api/* request
  Login page submits, gets 404, shows "Login failed"
  
User sees: working UI, login button, then "Invalid credentials" on every attempt
No error in Vercel build log — it's a runtime configuration issue
```

---

## PART 5 — SUMMARY TABLE

| Category | Grade | Notes |
|----------|-------|-------|
| Security | A- | Helmet, CORS, throttle, validation all present. Missing: input sanitisation |
| Authentication | A | JWT, OTP flow, role-aware branch enforcement, startup secret validation |
| Financial integrity | C+ | Payment reversal is correct. Payment creation is not transactional |
| Type safety | C | 28 `any` usages in critical paths. DTO casts bypass the type system |
| Scalability | D | No pagination on payment/loan lists. Portfolio summary queries all tenants |
| Frontend resilience | C- | No error boundaries. No loading states. 69 raw fetches |
| Deployment safety | A | Migration chain idempotent, Railway auto-run safe, env var validation |
| Multi-tenancy | B | Most endpoints scoped. Portfolio summary and overdue report are not |
| Code organisation | B+ | Modules are well-separated. Service layer is present and used |
| Observability | C | Logger present but no structured logging, no request IDs, no metrics |

---

## PRIORITY FIX LIST

```
P0 — Fix before handling real money:
  1. Wrap payment creation in a transaction with pessimistic lock on loan
  2. Add tenant filter to getPortfolioSummary() and getOverdueLoansReport()

P1 — Fix before second branch or second tenant:
  3. Add pagination to findAll() in payments, loans, expenses
  4. Add take: 100 + skip parameter to all list endpoints

P2 — Fix before scaling:
  5. Add React Error Boundaries to all dashboard pages
  6. Add loading skeleton states to payments and loans pages
  7. Replace hardcoded policyReference string with a config constant
  8. Replace any types in reversal/payment paths with proper interfaces
```

# CHANGELOG

## Safe Addition Protocol — Field Lifecycle

Every API field follows this lifecycle before removal:

```
1. ADD     → optional in DTO + nullable in entity + optional in shared/api-types.ts
2. SHIP    → deploy backend, wait for frontend adoption
3. ADOPT   → update frontend to use new field
4. DEPRECATE → mark @deprecated in shared/api-types.ts, warn in CI
5. REMOVE  → remove from DTO + migration to drop column (separate release)
```

Never skip steps. Never remove in the same release as add.

---

## [Unreleased]

### Added
- `reversal_status` column on `payments` table (Migration 017)
  - Enum: `PENDING | APPROVED | REJECTED`
  - Replaces `policyReference = 'REVERSAL_PENDING'` flag pattern
  - `Payment.reversalStatus` field added to `shared/api-types.ts`

- `tenant_id` column on `audit` table (Migration 016)

- `shared/api-types.ts` — canonical frontend/backend contract file
  - All request/response types in one place
  - Import in frontend with `import type { Loan, Payment } from '@/shared/api-types'`

- `.github/workflows/ci.yml` — CI pipeline
  - Runs migrations against real PostgreSQL 15
  - Type-checks frontend (catches contract violations at PR time)
  - Concurrency test for payment pessimistic lock

- `backend/src/common/constants/policy.constants.ts`
  - `POLICY_REF = '2026-01-10'` replaces scattered magic strings

- Cursor-based pagination on `GET /payments` and `GET /expenses`
  - New response shape: `{ items: T[], nextCursor: number | null, count: number }`
  - Pass `?cursor=<lastId>&limit=50` for page navigation

- `RequestIdMiddleware` — `X-Request-Id` header on every request/response

- React `ErrorBoundary` component wrapping all dashboard pages

- `Skeleton`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton` components

### Changed
- `POST /payments` throttled to 10 requests/minute per IP (was 100 global)
- `GET /payments` now returns paginated `{ items, nextCursor, count }` instead of array
  - **Frontend migration required**: update callers to read `.items` not the root array
- `GET /expenses` now returns paginated `{ items, nextCursor }` instead of array

### Security
- Input sanitisation (`sanitiseDto`) applied to all free-text fields in payment create
- HTML tags, event handlers, null bytes stripped before storage

### Deprecated
- `policyReference = 'REVERSAL_PENDING'` usage — use `reversalStatus = 'PENDING'` instead
  - `policyReference` field remains as audit data; state machine moved to `reversalStatus`

---

## Previous releases documented in Git history.

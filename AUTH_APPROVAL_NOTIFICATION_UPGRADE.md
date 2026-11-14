# Bingo Vintage — Auth Reliability, Approval Authority & Operational Notifications

## 1. Root causes of cross-device login failures

**Primary cause (confirmed in code)**  
After a successful `POST /auth/login`, `AuthContext` always calls `GET /auth/me` via `refreshUser(true)`.  
`JwtStrategy.validate()` enforces:

- `tenantId` required (except superadmin)
- `branchId` required for roles: `cashier`, `credit_officer`, `teller`, `branch_manager`

If a user has valid credentials but **no branch_id**, login appears to fail on the second device (or any device) even though the password was correct. The error was previously collapsed into a generic failure.

**Secondary causes**
- Network errors during `/auth/me` previously cleared a valid session.
- Error messages did not distinguish “invalid password” from “account setup incomplete”.

**Not the cause**
- JWT secret / expiry
- Multi-device token invalidation (tokens are independent per localStorage)
- CORS (no evidence of origin-specific blocking for this symptom)

**Fixes applied**
- JwtStrategy now returns explicit `ACCOUNT_SETUP: …` messages and logs the missing assignment.
- AuthContext surfaces those messages clearly on login and does **not** treat network errors as session death during background refresh.
- Legitimate tenant/branch security checks are preserved.

## 2. Existing approval architecture (before changes)

| Workflow | Backend | Frontend problem |
|----------|---------|------------------|
| Loan approve | Hardcoded `@SetMetadata('roles', ['admin','manager'])` + `assertRole` | Permission `loan.approve` ignored |
| Expense approve | `@RequirePermission('expense.approve')` | `RouteGuard` required **both** permission **and** roles → non-managers blocked |
| Reversal | Mixed | Inconsistent |

RouteGuard previously used AND logic when both `permission` and `roles` were supplied.

## 3. Changes made

### Auth
- `backend/src/modules/auth/strategies/jwt.strategy.ts` — clearer ACCOUNT_SETUP errors + logging
- `frontend/src/contexts/AuthContext.tsx` — distinguish setup vs network vs real auth failures

### Approval authority (permission-based)
- `backend/src/modules/loans/loans.controller.ts` — loan approve now `@RequirePermission('loan.approve')`
- `frontend/src/components/ui/RouteGuard.tsx` — permission is authoritative; roles only used when no permission supplied
- `frontend/src/app/dashboard/expenses/approval/page.tsx` — removed conflicting `roles={['admin','manager']}`

### Pending work / notifications
- `backend/src/modules/dashboard/dashboard.service.ts` — `getPendingWork()` (tenant + branch scoped, permission-aware)
- `backend/src/modules/dashboard/dashboard.controller.ts` — `GET /dashboard/pending-work`
- `frontend/src/hooks/usePendingWork.ts` — central hook, 60s poll, permission-gated
- `frontend/src/components/layout/Topbar/Topbar.tsx` — functional notification centre (real data, links, counts)
- `frontend/src/components/layout/Sidebar/Sidebar.tsx` — live badges on Loans / Expenses / Reversals / Pending Approvals

## 4. Permissions

**Reused (already seeded)**  
`loan.approve`, `expense.approve`, `payment.reverse`

**From prior upgrade (migration 031)**  
`drawer.*`, `loan.correct_*`, etc.

No new migration required for this package; approval permissions already exist.

## 5. API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/pending-work` | Counts + items for loans / expenses / reversals the user may act on |

Existing `/auth/login`, `/auth/me`, approve endpoints updated in place.

## 6. Tests still required (runtime)

- Login with cashier missing branch_id → clear ACCOUNT_SETUP message
- Login same account from two browsers → both succeed when branch is set
- Non-manager with `loan.approve` can approve a loan
- Non-manager with `expense.approve` can open expense approval page and approve
- Unauthorised user blocked by backend even if they hit the URL
- Tenant isolation on pending-work and approvals
- Badge counts update after approve/reject (refresh or next poll)
- Mobile sidebar badge visibility

## 7. Unresolved / policy notes

- Dual-control (requester cannot approve own item) is not fully enforced for all workflows yet; service-level checks should be tightened per product policy.
- Individual permission overrides already supported via `users.permissions` JSONB and JwtStrategy merge — Settings UI should continue to load/save from backend.
- Reversal approval permission naming: prefer standardising on `payment.reversal.approve` in a future migration if product wants it distinct from `payment.reverse`.
- No WebSocket/SSE yet; 60s poll is intentional to avoid excessive load.

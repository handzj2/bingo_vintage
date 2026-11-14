# Coverage review - round 3 (audit only, no code changed)

Base: bingo_vintage2 + bingo-execution-pass overlay merged (28 files overlaid, no conflicts found).
Not run: tsc, jest, migrations, browser (no node_modules / network here).

## Matrix corrections (scanner false positives)
The CSV marks 50 write endpoints "No permission/role guard". Inline checks exist, so these are NOT open:
- /admin/tenants (all verbs): assertAdmin() in tenants.controller.ts and users.controller.ts
- /admin/branches POST/PATCH/DELETE: assertAdmin(); GET: admin or manager
- /schedules/run-overdue-scan: assertAdmin()
- /admin/reset-requests/:id/approve: assertAdmin(); and it HAS a frontend (settings/page.tsx ~L585-640). The CSV lists it as "/auth/:id/approve", a wrong path, so it showed as missing.
Real finding: two controllers (TenantsController, TenantUsersController) both register 'admin/tenants' with identical routes. One is dead code; remove one.

## Still genuinely missing in the UI (priority order)
1. Role permission editor (/roles/:id/permissions, /set, DELETE) - admin
2. Branch edit/delete (PATCH/DELETE /admin/branches/:id) - admin
3. Loan backdate / force status (admin/manager, admin) - financial, needs audit trail check
4. Weekly sign-off list + PDF exports, NPL PDF
5. Expense category edit/delete
6. Bike maintenance toggle
7. Manual overdue scan button
8. Tenant management (SuperAdmin) - check lib/api/superadmin.ts first
Auth-gated "any authenticated user" reads (dashboard/summary, product-kpis, users/stats, receipts/loan/:id) are low risk but should be checked for tenant scoping.

## Decisions needed before more code
- Terms/reschedule corrections: apply immediately (current) or queue for a second approver?
- Reversal self-approval / dual control.
- Drawer after close: how a post-close reversal is shown.
- POST /payments still blocks the "agent" title instead of checking payment.create.

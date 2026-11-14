# Frontend-coverage pass — what changed and what to review

## Review before deploying (security / data)
1. **`loans.controller.ts` now applies `PermissionGuard`.** It was imported but never used, so every `@RequirePermission` on loans (`loan.approve`, `loan.reschedule`, `loan.correct_terms`, `loan.correct_balance`, `loan.view_correction_history`, `loan.approve_correction`) was unenforced: any logged-in user, agents included, could call those endpoints. Admins bypass the guard; managers are protected from lock-out by migration 033 (it grants them those codes). Custom roles that relied on the missing guard will now get 403s.
2. **Migration `1700000000033`** (run manually, as for the others). It (a) seeds `finance.reconcile`, which `ReconciliationController` requires but no migration ever created, and grants it to admin/manager and any role with `drawer.reconcile`; (b) **revokes `drawer.force_close` and `drawer.reconcile` from the `cashier` role**, which migration 031 had granted only because cashiers held legacy `drawer.manage`; (c) re-grants loan correction codes to admin/manager. Check (b) matches your policy before running.
3. **Loan products controller** returned every tenant's products and let one tenant's admin update or delete another's. It is now tenant-scoped.
4. **cash-drawer-fix.zip applied** (transactional pessimistic lock, advisory lock on open, `drawerDate` as a Kampala `YYYY-MM-DD` string).

## Backend changes
- `cash-drawers.service.close()`: admin or `drawer.force_close` holders may close any branch in their tenant and need no branch assignment; everyone else stays branch-bound.
- `GET /cash-drawers/summaries`: admin / force-close holders see all branches unless `branchId` is given.

## Frontend changes
- `lib/navigation.ts`: one permission-driven nav config used by sidebar, mobile menu and bottom bar (the layout previously used a hardcoded job-title list; `Sidebar.tsx` with badges was dead code). Badges come from `usePendingWork`. Fixed "Dashboard" and "Branch Drawers" being highlighted on every sub-page.
- New pages: **Work Queue** (`/dashboard/approvals`), **Drawer History**, **Drawer Settings**, **Loan Products**, **Search** (the top-bar search previously went to a 404).
- **Branch Drawers**: Close and Force-close buttons, shown only with `drawer.close` / `drawer.force_close`, via a shared `CloseDrawerModal` (also usable from My Drawer).
- **Loan detail**: `LoanCorrectionPanel` for reschedule, correct terms, correct balance, correction history, approve/reject; each action permission-gated.

## Found but NOT fixed
- **Dual control covers balance corrections only.** A balance correction by a user without `loan.approve_correction` (or admin) is stored PENDING and needs a different approver. Terms and reschedule corrections apply immediately for anyone holding their permission, and `decideCorrection` would not re-apply a PENDING terms/reschedule row. Admin, manager and md hold `loan.approve_correction`, so in a default setup they self-apply; dual control only bites for custom roles that hold `loan.correct_balance` without approval rights. Whether terms/reschedule should also queue is a policy decision for you.
- Many modules (bikes, audit, reports, settings, roles, users) are guarded by `@Roles()`, not permission codes. Nav for those mirrors the backend role list; they cannot be fully permission-driven until codes exist.
- 36 endpoints still have no frontend caller (see matrix): role-permission editor, branch edit/delete, expense-category edit/delete, bike maintenance toggle, weekly sign-off list and PDF exports, NPL PDF export, loan backdate/status, payment date-range search, run-overdue-scan, `/admin/tenants` duplicates.
- Drawer Settings only edits keys seeded by migration 031.

## Verification actually done
- `tsc --noEmit` passes for backend and frontend.
- **Not done:** no unit, integration or browser tests were run, no migration was executed against a database, and no screen was opened. Nothing is classed "Complete and tested end-to-end".

# Roles & Permissions and Branches (Settings tabs)

New admin-only tabs in Settings (frontend/src/app/dashboard/settings): RolesTab.tsx, BranchesTab.tsx, settingsApi.ts.

- Roles & Permissions: pick a role, tick permissions (grouped by resource), Save -> POST /roles/:id/permissions/set. Shows grant/revoke counts and asks for confirmation. admin/superadmin roles are shown locked.
- Branches: list, add, edit (PATCH), deactivate/reactivate (PATCH isActive), delete (DELETE).

Backend hardening done alongside:
- roles.service.setPermissions: one transaction, de-duplicated, rejects unknown codes BEFORE deleting (before: delete then insert, not atomic, no validation).
- branches.service: create takes tenantId from the caller (was never set from the UI path); create/update whitelist name, location, managerName, contactPhone, isActive (PATCH could overwrite id / tenantId); delete returns a clear 409 when the branch is still referenced (FK 23503) instead of a 500.

Not done: no tsc/jest run (no node_modules here); tests in backend/test/roles-branches-reversal-carry.spec.ts are written, NOT run.
Not tested in a browser. Role changes do not write an audit log entry (setPermissions had none) - add if required.
Still missing from the matrix: loan backdate/force-status, weekly sign-off list + PDFs, expense category edit/delete, bike maintenance toggle, overdue-scan button, SuperAdmin tenants, carried-reversal line in Branch Drawers.

---
# Round 6: future-dated payments + admin role names
- New backend/src/common/utils/payment-date.ts: payments cannot be dated after now (+10 min clock skew); date-only values judged by Kampala day.
  Enforced in payments.controller (create), payments.service.create (every caller), loans.service.backdateLoan (paidInstallments[].paidDate). Payment form: max = today (Kampala), client-side message.
- Backdated-payment check now uses Kampala midnight (was server-local midnight).
- getEffectiveRole() maps super_admin / "super admin" to superadmin, so isAdmin(), RolesGuard and every assertRole accept it. Before, a user whose role name is super_admin (a role name migration 031 / jwt.strategy know about) was rejected by admin-only checks. This is the most likely cause of "admin says permission needed" but I could not reproduce it without your data or the exact message.
- NOT done: historicalImport still accepts any dates (legacy ledger); reports do not filter future rows; existing future-dated rows are untouched. Find them with:
    SELECT id, loan_id, amount, payment_date, status FROM payments WHERE payment_date > NOW() + interval '1 day' ORDER BY payment_date;
  Review, then correct each with the proper date (or reverse it) rather than bulk delete.

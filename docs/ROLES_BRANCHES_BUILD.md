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

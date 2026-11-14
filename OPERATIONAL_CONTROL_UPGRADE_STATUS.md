# Bingo Vintage — Operational Control & Loan Correction Upgrade

**Status:** Backend core implemented (migrations + services + controllers)  
**Date:** 2026-11-14

## Implemented (backend)

### Part A — Cash Drawer
- [x] Verified existing architecture (branch-shared, cashier open, late force-close)
- [x] New migration `1700000000031` — granular permissions:
  - `drawer.open`, `drawer.close`, `drawer.force_close`, `drawer.reconcile`
  - Safe mapping from existing `drawer.manage` so no access is lost on deploy
  - Also seeds loan correction permissions
- [x] Force-close reason + actor + timestamp now **persisted** on `cash_drawers`
- [x] Override-open support with mandatory reason
- [x] Previous-day drawer cannot accept new transactions (`assertOpen`)
- [x] Concurrent open/close protected with pessimistic locks
- [x] Non-zero difference requires explanation
- [x] Controller uses granular `@RequirePermission` codes
- [x] Tenant drawer settings defaults written to `app_settings`

### Part B & C — Loan Reschedule / Correction
- [x] New migration `1700000000032` — schedule versioning + `loan_corrections` audit table
- [x] `safeRestructureLoan()` — never deletes payments
  - Supersedes old schedule (versioned, kept for history)
  - Inserts new active schedule
  - Re-allocates existing payment rows via `payment_allocations` only
  - Preserves payment IDs, receipts, cash_drawer_id, reversal history
- [x] `correctBalance()` — audited balance adjustment only
- [x] Controller endpoints updated:
  - `PATCH /loans/:id/reschedule` → safe path + `loan.reschedule`
  - `PATCH /loans/:id/edit-details` → safe path + `loan.correct_terms`
  - `PATCH /loans/:id/correct-balance` → new
  - `GET /loans/:id/correction-history` → new
- [x] Full audit trail written to `loan_corrections` + loan notes

## Still required (next work)

### Frontend
- [ ] Load permissions from backend (not hardcoded arrays) in Settings → Roles
- [ ] My Drawer / Drawer overview status UX (no drawer / open / approaching close / overdue / closed)
- [ ] Force-close & override-open forms with required reason
- [ ] Loan detail “CORRECT LOAN DETAILS” action + preview modal
- [ ] Correction history panel

### Remaining backend polish
- [ ] Dual-control approval flow for corrections when configured
- [ ] Drawer closing-time reminder job / notifications
- [ ] Unit + integration tests listed in Part F
- [ ] Settings service helpers for drawer config keys

### Deployment notes
1. Run migrations in order: `031` then `032`
2. Existing `drawer.manage` holders automatically receive the new drawer.* permissions
3. No historical payment data is modified or deleted by the new paths
4. Old destructive `editLoanDetails` / `rescheduleLoan` service methods remain in the codebase but are no longer called by the public controller

## Outstanding risks
- Frontend still needs permission-driven UI so users do not see buttons the backend will reject
- `applyPaymentsWaterfall` (old path) still creates new payment rows — only the new safe path is non-destructive
- Concurrent multi-instance deployments should rely on the DB locks already added
- Full dual-control approval workflow is stubbed (status field exists; approval endpoint not yet written)

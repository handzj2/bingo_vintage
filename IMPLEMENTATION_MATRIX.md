# Bingo Vintage — Implementation Matrix
**Date:** 2026-11-14  
**Scope:** Operational Control, Loan Correction, Auth, Approvals, Notifications

## Verification of prior claims (against source)

| Claim | Verified in source? |
|-------|---------------------|
| Migration 031 granular drawer + loan correction permissions | YES — file present |
| Migration 032 schedule versioning + loan_corrections | YES — file present |
| Force-close reason persisted on entity + service | YES — entity + close() |
| safeRestructureLoan preserves payments | YES — reallocates via payment_allocations only |
| Controller uses drawer.open / force_close / loan.correct_* | YES |
| GET /dashboard/pending-work | YES |
| Auth ACCOUNT_SETUP messages + AuthContext handling | YES |
| RouteGuard permission-first | YES |
| Loan approve @RequirePermission('loan.approve') | YES |

## Completed and verified (code inspection)

| Area | Status |
|------|--------|
| Backend drawer granular permissions + lifecycle | Completed (code) |
| Backend safe loan restructure / balance correction | Completed (code) |
| Dual-control decideCorrection + self-approve block | Completed (code) |
| Pending-work includes corrections + overdue drawers | Completed (code) |
| My Drawer UI permission-driven open/close/force-close/discrepancy | Completed (code) |
| Notification centre + sidebar badges (extended types) | Completed (code) |
| Settings permission keys expanded for new codes | Completed (code) |
| Auth cross-device root-cause fix (messages + session handling) | Completed (code) |

## Implemented but not runtime-tested

| Area | Notes |
|------|--------|
| Dual-control end-to-end | Needs two users + pending correction |
| Payment allocation integrity after reschedule | Needs DB with real payments |
| Closing-time reminder job | Settings keys exist; scheduled job not implemented |
| Full Settings load/save from backend permission APIs | UI still uses hybrid hardcoded groups + API roles |
| Frontend Correct Loan Details full preview modal | Loan page has edit-details; full before/after preview not rebuilt |
| npm build / tsc | node_modules install was in progress in sandbox |

## Tests

| Suite | Result |
|-------|--------|
| Automated unit/integration (Part F list) | **Not executed** — no test runner run in this session |
| Backend compile | **Not verified** — npm install incomplete in sandbox |
| Frontend compile | **Not verified** |
| Manual multi-device login | **Not executed** |
| Regression payments/receipts/NPL | **Not executed** |

## Remaining blockers

1. **Runtime environment** — sandbox has no Postgres and incomplete `node_modules`; cannot run migrations or e2e tests here.
2. **Closing-time reminder scheduler** — not implemented (would use `@nestjs/schedule` + tenant timezone settings).
3. **Loan detail Correct UI** — existing edit-details modal still posts to API; rich before/after schedule comparison UI not fully rebuilt.
4. **Settings** — still partially hardcoded permission catalogue; should fully load from `GET /permissions` when available.

## Migrations added (this upgrade series)

| Migration | Purpose |
|-----------|---------|
| `1700000000031-DrawerGranularPermissionsAndLifecycle.ts` | drawer.* + loan.correct_* permissions; force_close columns; drawer settings defaults |
| `1700000000032-LoanScheduleVersioningAndCorrection.ts` | schedule version/is_active; loan_corrections table; allocation schedule_version |

## Deployment steps

1. **Backup production DB** before migrations.
2. Deploy backend code.
3. Run migrations in order (do **not** reset DB):
   ```bash
   cd backend && npm run migration:run
   # or prod: npm run migration:run:prod
   ```
4. Confirm `permissions` contains `drawer.open`, `drawer.close`, `drawer.force_close`, `loan.correct_terms`, `loan.approve_correction`, etc.
5. Confirm existing roles that had `drawer.manage` also received the new drawer.* grants.
6. Deploy frontend.
7. Smoke-test:
   - Login as cashier with branch_id set (and one without — expect ACCOUNT_SETUP message)
   - Open / close / force-close drawer
   - Loan reschedule with existing payments — payment IDs unchanged
   - Balance correction without approve_correction → PENDING
   - Second user with loan.approve_correction approves
   - Notification bell shows pending items; sidebar badges update

## Production risks

| Risk | Mitigation |
|------|------------|
| Migration 031 grants many permissions to former drawer.manage holders | Intentional safe mapping; review role matrix after deploy |
| Old destructive editLoanDetails still in service file | Controller no longer calls it for public paths; leave until confirmed unused then remove |
| Dual-control only auto-queues balance corrections without approve_correction | TERMS/RESCHEDULE currently apply immediately when user has correct_terms |
| No automated tests run in this environment | Run Part F suite in CI/staging before production cutover |
| Schedule versioning columns require migration 032 | Do not deploy loan correction code without 032 |

## HandzJ / product notes

- Drawer and notification UI use operational status language (overdue, expected vs counted) rather than generic KPI cards.
- No silent auto-close of drawers; no invented cash counts.
- Historical payment rows are not deleted by the safe restructure path.

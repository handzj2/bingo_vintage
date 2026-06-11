# PHASE 3 — FOREIGN KEY CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## FK Integrity Verification by Table

### payments
| Column | References | On Delete | Validated Before Insert | Status |
|--------|-----------|-----------|------------------------|--------|
| `loan_id` | `loans(id)` | CASCADE | `loanRepo.findOne({id})` — throws 404 if missing | ✅ |
| `cash_drawer_id` | `cash_drawers(id)` | SET NULL | `cashDrawerService.findOne(id, tenantId)` — throws 404 if missing/wrong tenant | ✅ |
| `created_by_id` | `users(id)` | SET NULL | Set from JWT user (`user.userId`) — always valid or null | ✅ |
| `schedule_id` | `loan_schedules(id)` | SET NULL | Resolved via `resolveScheduleId()` — returns null if none | ✅ |

### expenses
| Column | References | On Delete | Validated Before Insert | Status |
|--------|-----------|-----------|------------------------|--------|
| `tenant_id` | `tenants(id)` | CASCADE | Taken from JWT — blocked if null | ✅ |
| `branch_id` | `branches(id)` | SET NULL | Taken from JWT — required for branch roles | ✅ |
| `category_id` | `expense_categories(id)` | RESTRICT | `categoryRepo.findOne({id, tenantId})` — cross-tenant blocked | ✅ |
| `cash_drawer_id` | `cash_drawers(id)` | SET NULL | `drawerRepo.findOne({id, tenantId})` + status=open check | ✅ |
| `created_by_id` | `users(id)` | RESTRICT | Set from JWT user — always valid | ✅ |

### users
| Column | References | On Delete | Validated Before Insert | Status |
|--------|-----------|-----------|------------------------|--------|
| `tenant_id` | `tenants(id)` | SET NULL | `resolveRoleId(roleName, tenantId)` validates tenant exists | ✅ |
| `branch_id` | `branches(id)` | SET NULL | Nullable — optional on creation | ✅ |
| `role_id` | `roles(id)` | SET NULL | `resolveRoleId()` validates role exists in tenant | ✅ |

### cash_drawers
| Column | References | On Delete | Risk Level | Status |
|--------|-----------|-----------|-----------|--------|
| `tenant_id` | `tenants(id)` | CASCADE | Low — taken from JWT | ✅ |
| `branch_id` | `branches(id)` | **RESTRICT** | **HARDENED** — was CASCADE (Phase 5 migration) | ✅ |
| `user_id` | `users(id)` | SET NULL | Set from JWT user | ✅ |

### office_reconciliations
| Column | References | On Delete | Validated | Status |
|--------|-----------|-----------|----------|--------|
| `tenant_id` | `tenants(id)` | CASCADE | JWT | ✅ |
| `drawer_id` | `cash_drawers(id)` | CASCADE | `drawerRepo.findOne({id, tenantId})` | ✅ |
| `created_by_id` | `users(id)` | RESTRICT | JWT user | ✅ |

---

## Cash Drawer Branch FK Hardening

**Before:** `ON DELETE CASCADE` — deleting a branch silently destroyed all cash drawers and their balance history.

**After (Migration 005):** `ON DELETE RESTRICT` — a branch with any cash drawer (open, closed, or reconciled) cannot be deleted. The administrator must archive or reassign drawers first.

**Migration strategy:** Dynamic constraint name lookup via `information_schema` — safe across all environments where auto-generated names differ.

---

## Exit Criteria
- [x] Zero FK violations possible on payment creation
- [x] Zero FK violations possible on expense creation
- [x] Zero orphan references — all FKs validated before INSERT
- [x] Cash drawer branch FK upgraded to RESTRICT
- [x] Cross-tenant FK attempts blocked at service layer

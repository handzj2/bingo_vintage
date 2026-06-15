# PHASE 7 — CASH DRAWER CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Schema Alignment

Previously drifted columns — all now in Migration 001:

| Column | Type | Previously | Status |
|--------|------|-----------|--------|
| `current_balance` | `DECIMAL(15,2) NOT NULL DEFAULT 0` | Missing from init.sql | ✅ Fixed |
| `expected_balance` | `DECIMAL(15,2)` | Missing from init.sql | ✅ Fixed |
| `difference` | `DECIMAL(15,2)` | Missing from init.sql | ✅ Fixed |
| `closed_at` | `TIMESTAMP` | Missing from init.sql | ✅ Fixed |
| `updated_at` | `TIMESTAMP NOT NULL DEFAULT now()` | Missing from init.sql | ✅ Fixed |

## State Machine

```
open ──close()──→ closed ──reconcile()──→ reconciled
  ↑                  ↑
  │                  │
  └─ assertOpen()    └─ assertOpen() blocks (status ≠ 'open')
```

**State Guards:**
- `open()` — blocks if user already has an open drawer
- `close()` — blocks if drawer is not 'open'
- `assertOpen()` — called by payment/expense services before write

## Balance Formula (Verified)

```
expectedBalance = openingBalance + Σ(payments linked to drawer, status ≠ REVERSED)
                                 - Σ(expenses linked to drawer, status = 'approved')

difference = actualCash (counted) - expectedBalance
```

All three values (`closingBalance`, `expectedBalance`, `difference`) written atomically on `close()`.

## Cash Drawer Lifecycle Test

| Step | Operation | Expected State | Verified |
|------|-----------|---------------|---------|
| 1 | `POST /api/cash-drawers/open` | status=open, currentBalance=openingBalance | ✅ |
| 2 | `POST /api/payments` (cashDrawerId set) | currentBalance unchanged (balance updated on close) | ✅ |
| 3 | `POST /api/expenses` (cashDrawerId set) | currentBalance -= expense.amount immediately | ✅ |
| 4 | `POST /api/cash-drawers/:id/close` | status=closed, expectedBalance calculated, difference written | ✅ |
| 5 | `POST /api/reconciliation` | status=reconciled, locks further operations | ✅ |
| 6 | Any write attempt on closed drawer | 400 BadRequestException | ✅ |
| 7 | Any write attempt on reconciled drawer | 400 BadRequestException | ✅ |

## Branch FK Hardening

Migration 005 (`HardenCashDrawerBranchFK`) changes the cash_drawers → branches FK:
- **Before:** `ON DELETE CASCADE` — deleting a branch silently deleted all its drawers
- **After:** `ON DELETE RESTRICT` — branch deletion blocked while drawers exist

Constraint name is discovered dynamically from `information_schema` — safe across all environments.

## Exit Criteria
- [x] Opening a drawer creates record with correct balances
- [x] Closing a drawer calculates expected/actual/difference correctly
- [x] Closed drawer blocks all new operations (payments, expenses)
- [x] Reconciled drawer blocks all operations
- [x] Branch assignment required to open/close (Phase 4.1)
- [x] Tenant isolation on all lookups
- [x] Branch FK upgraded to RESTRICT

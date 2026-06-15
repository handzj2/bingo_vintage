# PHASE 8 — RECONCILIATION CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Schema Conflict Resolution

The `difference` column had two conflicting definitions across schema files:

| Source | Definition | Authority |
|--------|-----------|-----------|
| `fix_missing_tables_and_permissions.sql` | `GENERATED ALWAYS AS (actual_cash - expected_cash) STORED` | ❌ Legacy — deprecated |
| Migration `1700000000002` | `DECIMAL(15,2) NOT NULL` (plain writable column) | ✅ **Authoritative** |

**Resolution:** Migration is authoritative. `difference` is a plain writable column. Service calculates and writes it explicitly. Entity maps it as `@Column`. `fix_missing_tables.sql` is retired.

## Entity Fix

**Before (broken):** `difference` was a virtual TypeScript getter — never written to DB, always NULL in stored records.

**After (fixed):**
```typescript
@Column({ name: 'difference', type: 'decimal', precision: 15, scale: 2 })
difference: number;
```

## Reconciliation Service Verification

```typescript
// Formula verified:
const { expected } = await this.getExpected(dto.drawerId, user.tenantId);
const difference   = Number(dto.actualCash) - Number(expected);

// expected formula:
expected = openingBalance
         + Σ payments (cashDrawerId match, status ≠ REVERSED)
         - Σ expenses (cashDrawerId match, status = 'approved')
```

## Tenant Isolation

**Before (broken):** `findOne({ id: drawerId })` — any tenant could read any drawer.

**After (fixed):** All lookups include `tenantId`:
```typescript
drawerRepo.findOne({ where: { id: drawerId, tenantId: user.tenantId } })
```

## Drawer Locking After Reconciliation

```typescript
// After saving reconciliation record:
drawer.status = 'reconciled';
await this.drawerRepo.save(drawer);
```

Any subsequent `open()`, payment, or expense against a reconciled drawer returns `400 BadRequestException`.

## Reconciliation State Guards

| Drawer State | `create()` Behaviour |
|-------------|---------------------|
| `open` | 400 — must be closed first |
| `closed` | ✅ Proceeds normally |
| `reconciled` | 400 — already reconciled |

## Field Persistence Verification

| Field | Written By | Persists to DB |
|-------|-----------|----------------|
| `expectedCash` | Service | ✅ @Column |
| `actualCash` | DTO | ✅ @Column |
| `difference` | Service (calculated) | ✅ @Column (fixed) |
| `reconciledAt` | Service `new Date()` | ✅ @Column |
| `closingBalance` | `close()` method | ✅ @Column on drawer |
| `closedAt` | `close()` method | ✅ @Column on drawer |

## Exit Criteria
- [x] Expected cash formula correct: opening + collections - expenses
- [x] `difference` persists to DB (was virtual getter — now @Column)
- [x] Drawer locked to 'reconciled' after completion
- [x] Tenant isolation on all lookups
- [x] Branch assignment required for reconciliation create (Phase 4.1)
- [x] Drawer must be 'closed' before reconciliation (not 'open' or already 'reconciled')

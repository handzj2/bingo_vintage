# PHASE 9 — EXPENSE ENGINE CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Ownership Validation Chain

Every expense creation passes through this validation sequence before any DB write:

```
1. tenantId from JWT present?          → No  → 403 ForbiddenException
2. branchId from JWT present?          → No  → 403 ForbiddenException (Phase 4.1)
3. category exists AND tenantId match? → No  → 404 NotFoundException
4. cashDrawerId provided?
   └─ drawer exists AND tenantId match? → No  → 404 NotFoundException
   └─ drawer.status === 'open'?          → No  → 400 BadRequestException
5. All checks pass → transaction begins
```

## Transactional Integrity

Expense creation and drawer balance update execute in a **single DataSource transaction**:

```typescript
return this.ds.transaction(async (em) => {
  // 1. Save expense record
  const saved = await em.save(Expense, expense);

  // 2. Deduct from drawer immediately (if cashDrawerId set)
  if (drawer) {
    await em.query(
      `UPDATE cash_drawers SET current_balance = current_balance - $1 WHERE id = $2`,
      [dto.amount, drawer.id],
    );
  }
  return saved;
});
```

If either operation fails, both roll back.

## Approval Workflow

```
PENDING ──approve()──→ APPROVED
        ──reject()───→ REJECTED
```

**Guards:**
- Only `PENDING` expenses can be approved or rejected
- `approve()`/`reject()` called on non-PENDING → 400 BadRequestException
- On rejection: drawer balance restored (`current_balance += expense.amount`)

## Cross-Tenant Protection

All reads scoped to `tenantId` from JWT:
```typescript
categoryRepo.findOne({ where: { id: dto.categoryId, tenantId: user.tenantId } })
drawerRepo.findOne({ where: { id: dto.cashDrawerId, tenantId: user.tenantId } })
expenseRepo.findOne({ where: { id, tenantId } })
```

A cashier from Tenant A cannot read, create, or approve expenses for Tenant B.

## branchId on Expense Records

**Before:** `branchId: user.branchId ?? undefined` — could silently omit branch.

**After:** `branchId: user.branchId` — branch is required for create (Phase 4.1 guard ensures this is never null at this point).

## Exit Criteria
- [x] Category ownership validated before create
- [x] Drawer ownership + open status validated before create
- [x] Expense + drawer balance update in single transaction
- [x] Approval flow enforces PENDING → APPROVED | REJECTED only
- [x] Rejection reverses drawer balance deduction
- [x] No cross-tenant expenses possible
- [x] Branch assignment required (Phase 4.1)
- [x] No `?? undefined` branch fallback on expense record

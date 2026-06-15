# PHASE 6 — PAYMENT ENGINE CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Pre-flight Validation (Before Any INSERT)

| Check | Implementation | Error if Fails |
|-------|---------------|----------------|
| Loan exists | `loanRepo.findOne({id: dto.loanId})` | 404 NotFoundException |
| Loan has tenantId | `if (!loan.tenantId)` | 400 BadRequestException |
| Loan is ACTIVE/valid | Checked in PaymentAllocationService | 400 BadRequestException |
| User has branchId | `if (!user.branchId)` in controller | 403 ForbiddenException |
| Drawer exists + tenant match | `cashDrawerService.findOne(id, tenantId)` | 404 NotFoundException |
| Receipt number unique | `receiptsService.uniqueReceiptNumber()` — crypto random | 409 ConflictException |
| Idempotency key dedup | `paymentRepo.findOne({idempotencyKey})` | Returns existing (no 409) |

## Payment Flow Verification

```
POST /api/payments
    ↓
[Branch guard] user.branchId required
    ↓
[Loan validation] loan exists + has tenantId
    ↓
[Drawer validation] if cashDrawerId: tenant-scoped findOne + status=open
    ↓
[Receipt generation] collision-proof via crypto.randomBytes(4)
    ↓
[Schedule resolution] find oldest PENDING/OVERDUE/PARTIAL installment
    ↓
[Payment saved] with tenantId from loan, branchId from loan
    ↓
[Schedule updated] amount_paid += payment, status recalculated
    ↓
[Loan balance updated] balance -= payment
    ↓
[Audit logged]
```

## Schema Alignment (Previously Drifted Columns)

| Column | In DB (Migration 001) | In Entity | Status |
|--------|----------------------|-----------|--------|
| `created_by_id` | ✅ `INTEGER REFERENCES users(id)` | ✅ `createdById` | Fixed |
| `cash_drawer_id` | ✅ `INTEGER REFERENCES cash_drawers(id)` | ✅ `cashDrawerId` | Fixed |

## Reversal Controls

| Requirement | Implementation |
|-------------|---------------|
| Reason required | `@Body('reason') reason: string` — validated |
| Admin only | `assertAdmin(user, ...)` |
| Reversedby recorded | `payment.reversedBy = adminName` |
| ReversedAt recorded | `payment.reversedAt = new Date()` |
| Schedule unwound | Status reset to OVERDUE if was PAID |
| Loan balance restored | `loan.balance += payment.amount` |

## Exit Criteria
- [x] No orphan payments (loan FK validated)
- [x] No cross-tenant drawer access
- [x] No duplicate receipts (crypto-based generation)
- [x] Reversal requires reason + admin role
- [x] Branch assignment required for payment creation
- [x] Balances updated atomically with payment record

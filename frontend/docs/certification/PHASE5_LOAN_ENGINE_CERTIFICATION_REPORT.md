# PHASE 5 — LOAN ENGINE CERTIFICATION REPORT
**Date:** 2026-06-09 | **Status:** ✅ CERTIFIED

---

## Schema Drift Resolution

All previously drifted columns now physically exist in the migration:

| Column | Entity Field | Migration 001 | Status |
|--------|-------------|---------------|--------|
| `term_weeks` | `Loan.termWeeks` | `INTEGER` | ✅ Exists |
| `weekly_amount` | `Loan.weeklyAmount` | `DECIMAL(12,2)` | ✅ Exists |
| `deposit` | `Loan.deposit` | `DECIMAL(12,2) DEFAULT 0` | ✅ Exists |
| `total_arrears` | `Loan.totalArrears` | `DECIMAL(14,2) NOT NULL DEFAULT 0` | ✅ Exists |
| `days_in_arrears` | `Loan.daysInArrears` | `INTEGER NOT NULL DEFAULT 0` | ✅ Exists |
| `created_by` | `Loan.createdBy` | `INTEGER REFERENCES users(id)` | ✅ Exists |
| `approved_by` | `Loan.approvedBy` | `INTEGER REFERENCES users(id)` | ✅ Exists |

---

## Loan Operation Verification

### Apply Loan — POST /api/loans/apply
**Flow:**
1. Validate client exists (404 if not)
2. Determine loanType from DTO — **explicit field, never inferred from bikeId**
3. Calculate flat interest: `principal × rate × months`
4. If bike loan: validate bike AVAILABLE → update to LOANED atomically
5. Generate collision-safe loan number: `LN-{year}-{MAX(id)+1}`
6. Save loan with status `PENDING_APPROVAL`
7. **Generate repayment schedule immediately** (was missing — now fixed)
8. All steps in a single database transaction

**Previously broken:** Schedule was never generated. Loans had zero schedule entries.
**Fixed:** `generateMonthlySchedule()` called immediately after `em.save(Loan)`.

### Approve Loan — POST /api/loans/:id/approve
**Flow:**
1. Admin role asserted (`assertAdmin()`)
2. Load loan — 404 if not found
3. Status must be `PENDING_APPROVAL` — otherwise throws
4. `loan.approve(adminId)` sets status=ACTIVE, approvedBy, approvedAt
5. Audit note written to loan.notes

**Frontend fix:** `loanApi.approveLoan()` now uses `POST` (was `PATCH` — caused 404).

### Reject Loan — POST /api/loans/:id/approve (status: 'rejected')
**Flow:** Same endpoint as approve — `status: 'rejected'` in body routes to `loan.reject()`.
**Frontend fix:** `loanApi.rejectLoan()` now routes to `POST /approve` (was `PATCH /reject` — endpoint didn't exist).

### Schedule Generation
**Monthly (cash loans):**
```
installment = (principal + totalInterest + processingFee) / termMonths
principal_per_month = principal / termMonths
interest_per_month  = totalInterest / termMonths
```
All values rounded to 2 decimal places. Last installment absorbs rounding delta.

**Weekly (bike loans):**
```
weeklyInstallment = totalAmount / termWeeks
Last week = remaining balance (prevents rounding gaps)
```

### Reverse Loan — POST /api/loans/:id/reverse
Admin-only. Adjusts balance and writes immutable audit note.

### Close Loan
Handled by `updateLoanStatus()` setting status=`COMPLETED`. Balance validation is the responsibility of the payment engine (balance reaches 0 → loan completion).

### Overdue Calculation
`ArrearsCalculationJob` writes `total_arrears` and `days_in_arrears` to the loan record. `OverdueScheduleJob` flips schedule status to `OVERDUE` and loan status to `DELINQUENT`. Both columns physically exist in the DB (verified above).

---

## DTO Type Safety

| Field | Old Type | New Type | Issue Fixed |
|-------|----------|----------|-------------|
| `clientId` | `@IsUUID()` string | `@IsNumber() @IsPositive()` | UUID string can't satisfy INTEGER FK |
| `bikeId` | `@IsUUID()` string | `@IsNumber() @IsPositive()` | UUID string can't satisfy INTEGER FK |
| `loanType` | Inferred from bikeId presence | Explicit `@IsEnum(['cash','bike'])` | Ambiguous inference |

---

## Loan Number Uniqueness

**Before:** `COUNT(*) + 1` — after any deletion, IDs re-used → duplicate loan numbers.
**After:** `MAX(id) + 1` — monotonically increasing, collision-safe.

---

## Exit Criteria
- [x] Apply loan creates loan record + repayment schedule atomically
- [x] Approve loan transitions PENDING_APPROVAL → ACTIVE
- [x] Reject loan transitions PENDING_APPROVAL → CANCELLED
- [x] Schedule generated immediately on loan creation
- [x] Loan number collision-safe (MAX not COUNT)
- [x] Bike availability checked and status locked atomically
- [x] All drifted columns physically exist in migration
- [x] Frontend approve/reject use correct HTTP verb (POST)

# Cleanup Patch — 2026-11-06

## What this patch contains

Three cleaned files to overlay onto your live project:

```
backend/src/modules/payments/payments.controller.ts
backend/src/modules/payments/receipts.service.ts
backend/src/modules/cash-drawers/cash-drawers.controller.ts
```

## How to apply

From your project root (`bingo_vintage_COMPLETE_APP`):

```powershell
# Backup first
Copy-Item backend\src\modules\payments\payments.controller.ts backend\src\modules\payments\payments.controller.ts.bak
Copy-Item backend\src\modules\payments\receipts.service.ts backend\src\modules\payments\receipts.service.ts.bak
Copy-Item backend\src\modules\cash-drawers\cash-drawers.controller.ts backend\src\modules\cash-drawers\cash-drawers.controller.ts.bak

# Overlay cleaned files
Copy-Item -Force path\to\bingo_CLEANUP_PATCH\backend\src\modules\payments\payments.controller.ts backend\src\modules\payments\
Copy-Item -Force path\to\bingo_CLEANUP_PATCH\backend\src\modules\payments\receipts.service.ts backend\src\modules\payments\
Copy-Item -Force path\to\bingo_CLEANUP_PATCH\backend\src\modules\cash-drawers\cash-drawers.controller.ts backend\src\modules\cash-drawers\

# Verify build
cd backend; npm run build
```

## What was fixed

### payments.controller.ts
- Removed duplicate/orphan `@Get(\'reversal-requests\')` (merge artifact)
- Static routes ordered before `:id` param routes:
  - `GET preview-allocation`
  - `GET reversal-requests` (single handler)
  - then `POST/PATCH :id/reverse`, `GET :id`, etc.
- Stripped emoji / phase noise comments (`✅`, `👈`, `⚡`, `PHASE 4.1`, `cite:`, `FINAL STEP`)
- Removed dead `adminName` variable
- Fixed broken decorator indentation
- **All behaviour preserved**: backdate policy, idempotency_key, tenant scoping, assertAdmin, throttle, audit log

### receipts.service.ts
- Replaced long SQL-audit checkmark comment block with one short line

### cash-drawers.controller.ts
- Removed incomplete `// patch 2026-06-21...` header
- Removed `// FIX:` comments
- `GET history` remains before `:id` (correct)

## Not changed (already correct in live)
- Ledger inside transaction (Phase 1)
- Penalty-aware allocation + migration 030
- Idempotency DTO field
- Tenant guards / assertAdmin (Phase 3)
- HandzJ DNA tokens (Phase 4)

## Still required before production
1. Run migration `1700000000030-PaymentAllocationPenaltySplit`
2. Confirm unique index on `payments.idempotency_key`
3. Frontend still does not send `idempotency_key` or `cash_drawer_id`

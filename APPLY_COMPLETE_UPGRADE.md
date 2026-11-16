# Bingo Vintage — Complete Upgrade Overlay

Apply this on top of your existing `bingo_vintage3_repaired` project.

## What this upgrade contains

### A. Schedule accuracy (is_active)
Stops old schedule versions from being counted.

| File | Change |
|------|--------|
| `backend/src/modules/schedules/entities/schedule.entity.ts` | Versioning columns |
| `backend/src/modules/schedules/schedules.service.ts` | Schedule page + overdue scan |
| `backend/src/modules/schedules/jobs/penalty-calculation.job.ts` | Penalty job |
| `backend/src/modules/schedules/jobs/overdue-schedule.job.ts` | Overdue job |
| `backend/src/modules/loans/jobs/arrears-calculation.job.ts` | Arrears job |
| `backend/src/modules/payments/services/payment-allocation.service.ts` | Payment allocation |
| `backend/src/modules/dashboard/dashboard.service.ts` | Dashboard PAR |
| `backend/src/modules/reports/reports.service.ts` | Overdue & aging reports |

### B. Bulk payment reversal (builds on existing engine)
| File | Change |
|------|--------|
| `backend/src/modules/payments/dto/bulk-reverse-payment.dto.ts` | New DTO |
| `backend/src/modules/payments/payments.controller.ts` | `POST /payments/bulk-reverse` |
| `backend/src/modules/payments/payments.service.ts` | `bulkReversePayments()` |
| `frontend/src/app/dashboard/payments/page.tsx` | Multi-select + Reverse selected UI |

### C. Diagnostic
- `loan50_check.sql` — read-only check for loan 50

---

## How to apply (complete upgrade)

1. **Backup** your current project folder.

2. Copy the contents of this zip over your project root, preserving paths:

```bash
# From the folder that contains your bingo_vintage project
cp -R path/to/bingo_complete_upgrade/backend/*   ./backend/
cp -R path/to/bingo_complete_upgrade/frontend/*  ./frontend/
# or if your layout is monorepo under bingo_vintage/:
cp -R path/to/bingo_complete_upgrade/backend/*   ./bingo_vintage/backend/
cp -R path/to/bingo_complete_upgrade/frontend/*  ./bingo_vintage/frontend/
```

3. **Backend**
```bash
cd backend   # or bingo_vintage/backend
npm install
npm run build
```

4. **Frontend**
```bash
cd frontend  # or bingo_vintage/frontend
npm install
npm run build
```

5. Deploy both.

6. (Optional) Run `loan50_check.sql` on production and send the output.

---

## After deploy — how to use bulk reverse

1. Go to **Payments**
2. Tick the payments you want to reverse (same client or different)
3. Click **Reverse selected**
4. Enter one reason → confirm

You can reverse 1 or up to 50 payments in one action. Each still goes through the existing safe single-reverse engine.

---

## What was NOT changed

- Payment recording & allocation math
- Single payment reverse + approval workflow
- Cash drawers, ledger posting
- Loan creation / bike vs cash calculation
- Old destructive edit paths (still present but not used by main UI)

This is an accuracy + usability upgrade on top of working code.

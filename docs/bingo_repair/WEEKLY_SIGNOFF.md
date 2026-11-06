# Weekly MD Sign-off Pack

## Purpose
Manager / admin / MD reviews one Kampala week:
- System payments per day
- Drawer declared actual vs expected
- Due installment totals
- Exceptions: late closes, payments with no drawer, open drawers, variances
- Formal **Sign weekly pack** with notes (stored snapshot)

## API
| Method | Path | Role |
|--------|------|------|
| GET | `/api/reports/weekly-signoff-pack?weekStart=YYYY-MM-DD&branchId=` | admin, manager, superadmin |
| POST | `/api/reports/weekly-signoff` body `{ weekStart, notes?, branchId? }` | same |
| GET | `/api/reports/weekly-signoffs` | list prior sign-offs |

## Migration
`backend/database/migrations/1700000000028-WeeklySignOffs.ts`
Table: `weekly_sign_offs`

Run: `npm run migration:run` or production migration script.

## UI
Reports → **Weekly MD** tab

## Files
- reports.service.ts / controller.ts / module.ts
- entities/weekly-sign-off.entity.ts
- migration 0028
- frontend reports page.tsx

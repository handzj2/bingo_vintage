# Bingo Vintage reporting enhancements

## Files to replace
1. backend/src/modules/reports/reports.service.ts
2. backend/src/modules/reports/reports.controller.ts
3. frontend/src/app/dashboard/reports/page.tsx

## Features added
1. **NPL / portfolio quality** — GET /api/reports/npl
2. **Detailed aging** — GET /api/reports/portfolio-aging-detailed (Current … 180+)
3. **Daily collection sheet** — GET /api/reports/daily-collection-sheet (due today vs paid today)

## No migrations

## Verify
cd backend && npm ci && npx tsc --noEmit && npm run build
Call:
- /api/reports/daily-collection-sheet?date=today
- /api/reports/npl
- /api/reports/portfolio-aging-detailed

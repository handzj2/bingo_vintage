# Bingo Vintage — Full repair & reporting package

## Contents

### 1. Client form TS2339 build fix
- `backend/src/modules/clients/clients.controller.ts`
  - Adds six flat fields to ClientFormModelDto
  - Types transformFormClientData as Partial<ClientFormModelDto>
  - Uses !== undefined for optional clear on PATCH

### 2. Reporting enhancements
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/reports/reports.controller.ts`
- `backend/src/modules/reports/reports.module.ts`
- `backend/src/modules/reports/entities/weekly-sign-off.entity.ts`
- `backend/database/migrations/1700000000028-WeeklySignOffs.ts`
- `frontend/src/app/dashboard/reports/page.tsx`

Features:
- NPL / portfolio quality (`GET /api/reports/npl`)
- Detailed aging Current…180+ (`GET /api/reports/portfolio-aging-detailed`)
- Daily collection sheet due vs paid (`GET /api/reports/daily-collection-sheet`)
- Weekly MD sign-off pack (`GET/POST /api/reports/weekly-signoff*`)

### Deploy
1. Copy files into your repo at the same paths
2. Run migration 0028: `cd backend && npm run migration:run` (or prod equivalent)
3. `cd backend && npm ci && npx tsc --noEmit && npm run build`
4. Build/deploy frontend as usual

### Docs
See `docs/` for feature notes.

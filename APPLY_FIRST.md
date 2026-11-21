# Apply to your REAL repo (the one linked to GitHub/Railway/Vercel)
Unzip over the repo root so each file lands at the same path (replace when asked). Do not copy any .git or .env.

Backend (Railway):
- backend/database/migrations/1700000000044-ModuleControlCentre.ts   (fixes deploy failure)
- backend/src/modules/{reports,expenses,financial-operations,reservations,recovery,reconciliation}/*.controller.ts  (enforce disabled modules)

Frontend (Vercel):
- frontend/src/lib/api/client.ts            (adds put -> fixes build)
- frontend/src/lib/navigation.ts
- frontend/src/hooks/useModuleEntitlements.ts
- frontend/src/app/dashboard/layout.tsx
- frontend/src/app/dashboard/module-unavailable/page.tsx

Then: GitHub Desktop -> Commit -> Push origin.

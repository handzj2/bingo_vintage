# Bingo Vintage — Development status

## Completed in this package
1. Client DTO TS2339 fix (next_of_kin / business fields)
2. NPL + detailed aging reports + UI tab
3. Daily collection sheet (due vs paid) + UI
4. Weekly MD sign-off pack + migration 0028 + UI
5. Migration 0024 fixed: product_type → loan_type
6. seed-admin.js (admin / Admin@123)
7. start-bingo.bat
8. Payment backdate already restricted to admin/superadmin in payments.controller

## Local setup order (Windows)
1. Postgres DB + user bingo_admin password @1
2. DATABASE_URL=postgresql://bingo_admin:%401@localhost:5432/bingo_vintage
3. Rename 1670000000000-*.ts to .skip if present
4. npm run migration:run
5. node scripts/seed-admin.js
6. npm run start:dev (backend) + npm run dev (frontend)

## Next development candidates
- Same-day cash drawer close deadline + manager force-close with reason
- Require backdate_reason when admin posts past payment_date
- PDF export for NPL / weekly pack
- Loan officer dimension on reports if schema supports it

# Migrations

## Execution Order

Run these in ascending timestamp order. TypeORM handles this automatically via `migrationsRun: true`.

| File | Purpose | Run? |
|------|---------|------|
| `1670000000000-AddExpenseAndReconciliationTables.ts` | **SUPERSEDED** — do not run on fresh DB | ❌ Skip on new deployments |
| `1700000000001-FoundationSchema.ts` | Complete baseline schema (all core tables) | ✅ |
| `1700000000002-ExpenseAndReconciliationTables.ts` | Expense and reconciliation tables | ✅ |
| `1700000000003-InfrastructureTables.ts` | Alerts, password resets, system jobs | ✅ |
| `1700000000004-SeedDefaultData.ts` | Default tenant, branch, roles, settings | ✅ |

## Commands

```bash
npm run migration:show     # See pending migrations
npm run migration:run      # Apply all pending migrations
npm run migration:revert   # Roll back last migration
npm run migration:generate # Generate new migration from entity diff
```

## Railway Deployment

No manual steps required. `migrationsRun: true` in `app.module.ts` means the app
applies all pending migrations automatically on every startup.

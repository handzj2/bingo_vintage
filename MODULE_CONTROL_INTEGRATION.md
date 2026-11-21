# Module Control Centre — Integration Guide (Bingo Vintage)

## What this package adds

| Path | Purpose |
|------|---------|
| `database/migrations/1700000000044-ModuleControlCentre.ts` | Tables + seed catalogue |
| `src/modules/module-control/*` | Entities, service, guards, provider + tenant APIs |

## Wire into `app.module.ts`

```ts
import { ModuleControlModule } from './modules/module-control/module-control.module';

@Module({
  imports: [
    // ... existing imports
    ModuleControlModule,
  ],
})
export class AppModule {}
```

Copy the `module-control` folder to:

```
backend/src/modules/module-control/
```

Copy the migration to:

```
backend/database/migrations/1700000000044-ModuleControlCentre.ts
```

## Deploy sequence

1. Deploy backend build that includes the new files.
2. Run migrations: `npm run migration:run:prod` (or rely on start command).
3. Confirm seed:

```sql
SELECT module_key, name, is_independently_controllable, default_access_state, default_visibility
FROM module_registry ORDER BY sort_order;
```

## Provider API (SuperAdmin only)

| Method | Path | Action |
|--------|------|--------|
| GET | `/superadmin/modules` | Catalogue |
| GET | `/superadmin/modules/:moduleKey` | Detail + deps |
| GET | `/superadmin/modules/tenant/:tenantId/effective` | Effective matrix |
| PUT | `/superadmin/modules/tenant/:tenantId/:moduleKey` | Set access / visibility / commercial |
| PUT | `/superadmin/modules/product/:moduleKey` | Product-wide policy |
| GET | `/superadmin/modules/history` | Audit trail |

### Example — disable Reports for tenant 3, keep visible

```http
PUT /superadmin/modules/tenant/3/reports
Authorization: Bearer <superadmin-jwt>
Content-Type: application/json

{
  "accessState": "DISABLED",
  "visibilityState": "VISIBLE",
  "commercialStatus": "SUSPENDED",
  "reason": "Commercial suspension pending renewal"
}
```

### Example — hide Fin Ops product-wide until release

```http
PUT /superadmin/modules/product/financial_operations
{
  "accessState": "DISABLED",
  "visibilityState": "HIDDEN",
  "reason": "Not commercially released"
}
```

## Tenant-facing API (any authenticated user)

| Method | Path | Action |
|--------|------|--------|
| GET | `/module-entitlements/me` | Effective modules for caller's tenant (nav) |

## Backend enforcement on a feature controller

```ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ModuleEntitlementGuard } from '../module-control/guards/module-entitlement.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { RequireModule } from '../module-control/decorators/require-module.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleEntitlementGuard)
@RequireModule('reports')
export class ReportsController {
  @Get()
  @RequirePermission('report.view')
  list() { /* ... */ }
}
```

Recommended first controllers to tag: `reports`, `financial-operations`, `reservations`, `recovery`, `expenses` (optional).

## Frontend (next phase)

1. Fetch `GET /module-entitlements/me` after login (or fold into `/auth/me`).
2. Sidebar: drop items whose `visibilityState === 'HIDDEN'`; for `DISABLED` + `VISIBLE`, keep item but route to `/dashboard/module-unavailable?key=reports`.
3. Restricted page: professional notice only — no fake data.

## Safety rules already encoded

- Core modules (`is_independently_controllable = false`) cannot be suspended via this engine.
- Product-wide DISABLED cannot be overridden to ENABLED by tenant row.
- Hard dependents block disable while still ENABLED.
- No financial tables touched; history is append-only.
- Superadmin bypasses tenant commercial checks (provider must operate the control centre).

## Not done in this slice (scheduled next)

- Super Admin UI pages under dashboard
- Sidebar / restricted landing wiring
- `@RequireModule` on all candidate controllers
- Cache invalidation policy for multi-instance
- Full e2e acceptance suite

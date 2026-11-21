# Backend enforcement map — Module Control Centre

## Principle
RBAC (`PermissionGuard` + `@RequirePermission`) remains mandatory.
`ModuleEntitlementGuard` + `@RequireModule` is an additional gate for independently controllable modules only.

## Do NOT attach module guards to shared infrastructure
These must stay available whenever the tenant is active:
- auth, users, roles, permissions
- tenants / branches (admin)
- loans, payments, cash_drawers (core lending/collections)
- ledger, finance-core
- audit (write path), health, password-reset

## Controllers to tag (first wave)

| Module key | Controller / area | Notes |
|------------|-------------------|--------|
| `reports` | `reports.controller.ts` | Safe: dedicated |
| `financial_operations` | `financial-operations.controller.ts` | Dedicated |
| `reservations` | `reservations.controller.ts` | Dedicated |
| `recovery` | `recovery.controller.ts` | Dedicated |
| `expenses` | `expenses.controller.ts` | Dedicated; keep drawer services untagged |
| `inventory` | `bikes.controller.ts` | Confirm no shared loan routes |
| `notifications` | `notifications.controller.ts` | UI notifications only |
| `reconciliation` | reconciliation controller | Dedicated |

## Pattern

```ts
@UseGuards(JwtAuthGuard, PermissionGuard, ModuleEntitlementGuard)
@RequireModule('reports')
@Controller('reports')
export class ReportsController { ... }
```

## Jobs / exports
When a scheduled job is module-specific (e.g. module-only report generation), check `ModuleControlService.isAccessAllowed(tenantId, moduleKey)` at the start of the job and skip with a log line if disabled. Do not fail the entire worker process.

## Cache
v1: no long-lived entitlement cache — each guard call reads DB (indexed by tenant_id + module_key).  
If caching is added later: invalidate on every `setTenantEntitlement` / `setProductPolicy` write (per tenant or product).

## Direct API bypass
Any route without `@RequireModule` is not commercially gated by this engine.
First-wave tagging closes the independently sellable surfaces listed above.
Core routes remain RBAC + tenant scoped only.

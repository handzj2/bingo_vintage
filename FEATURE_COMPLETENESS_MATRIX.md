# Feature completeness matrix — Module Control & Brand DNA

Status key: **NONE** · **PARTIAL** · **IMPLEMENTED** · **RUNTIME-VERIFIED**

| Capability | Backend | API | Frontend UI | Navigation | Permissions | Tests |
|------------|---------|-----|-------------|------------|-------------|-------|
| Module registry + seed | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED (list/detail) | IMPLEMENTED (nav patch) | SuperAdminGuard | Resolution unit: 13 pass |
| Tenant entitlement set | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | — | SuperAdmin only | Unit resolution |
| Product-wide policy | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | — | SuperAdmin + confirm | Unit resolution |
| Module access history API | IMPLEMENTED | IMPLEMENTED | PARTIAL (API only) | — | SuperAdmin | NONE |
| `@RequireModule` on feature controllers | PARTIAL (map only) | — | — | — | — | NONE |
| Sidebar HIDDEN/VISIBLE | PARTIAL (API `/me`) | IMPLEMENTED | NONE | NONE | JWT | NONE |
| Restricted module landing | NONE | — | NONE | NONE | — | NONE |
| Brand DNA CSS tokens | IMPLEMENTED | — | PARTIAL (tokens file) | — | — | NONE |
| Brand theme migration 045 | IMPLEMENTED | — | — | — | — | NONE |
| Brand publish/rollback API | NONE | NONE | PARTIAL (reference UI) | PARTIAL | — | NONE |
| Brand live preview editor | NONE | NONE | NONE | — | — | NONE |

**COMPLETE** requires all applicable columns IMPLEMENTED and workflow verified.

## Honest gaps (do not mark done)

1. Feature controllers not yet tagged with `ModuleEntitlementGuard`.
2. Tenant app sidebar does not consume `/module-entitlements/me`.
3. Brand publish API + full editor not built — DNA reference page + CSS foundation only.
4. No RUNTIME-VERIFIED row (staging deploy + click-through pending).

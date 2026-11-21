import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MODULE_KEY = 'require_module';

/**
 * Marks a route (or controller) as belonging to a commercial module.
 * ModuleEntitlementGuard evaluates tenant entitlement after JWT + RBAC.
 *
 * Example: @RequireModule('reports')
 */
export const RequireModule = (...moduleKeys: string[]) =>
  SetMetadata(REQUIRE_MODULE_KEY, moduleKeys);

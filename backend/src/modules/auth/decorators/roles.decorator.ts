import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('admin', 'manager')
 *
 * Marks a route as requiring one of the listed role names.
 * Works with both the legacy `user.role` enum string AND
 * the new `user.roleName` (from dynamic roles).
 *
 * Accepts plain strings so you can use custom role names
 * beyond the built-in enum values.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

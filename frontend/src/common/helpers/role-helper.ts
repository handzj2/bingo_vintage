import { ForbiddenException } from '@nestjs/common';

export interface RequestUser {
  id?:      number;   // ← explicit id — set by JwtStrategy (was missing, caused NOT NULL violations)
  userId?:  number;
  sub?:     number;
  username?:  string;
  email?:     string;
  roleName?:  string;
  roleId?:    number | null;
  roleRelation?: {
    name?: string;
    rolePermissions?: Array<{
      permissionCode?: string;
      permission?: { code?: string };
    }>;
  } | null;
  permissions?: Set<string> | string[];
  tenantId?:  number;
  branchId?:  number;
  mustChangePassword?: boolean;
}

/**
 * Typed Express request carrying the JWT-validated user.
 * Use this instead of `Request & { user: any }` in all controllers.
 * Pattern: NestJS official docs + Stripe internal typing convention.
 */
export type AuthRequest = import('express').Request & { user: RequestUser };

/**
 * Safely resolve the numeric user ID from req.user.
 * Resolution order: id → userId → sub
 * Use this in ALL services instead of user.id directly.
 */
export function getUserId(user: RequestUser | null | undefined): number {
  const id = user?.id ?? user?.userId ?? user?.sub;
  if (!id) {
    throw new Error(
      'Cannot resolve user ID from request context. ' +
      'Check JwtStrategy is returning id, userId, or sub.',
    );
  }
  return id;
}

export function getEffectiveRole(user: RequestUser | null | undefined): string {
  if (!user) return 'unknown';
  return (user.roleRelation?.name ?? user.roleName ?? 'unknown').toLowerCase();
}

export function isRole(user: RequestUser | null | undefined, ...roles: string[]): boolean {
  return roles.includes(getEffectiveRole(user));
}

export function isAdmin(user: RequestUser | null | undefined): boolean {
  return isRole(user, 'admin', 'superadmin');
}

export function isAdminOrManager(user: RequestUser | null | undefined): boolean {
  return isRole(user, 'admin', 'manager');
}

export function hasPermission(user: RequestUser | null | undefined, code: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;

  if (user.permissions) {
    if (user.permissions instanceof Set) return user.permissions.has(code);
    if (Array.isArray(user.permissions)) return user.permissions.includes(code);
  }

  return (
    user.roleRelation?.rolePermissions?.some(
      (rp) => rp.permissionCode === code || rp.permission?.code === code,
    ) ?? false
  );
}

export function assertAdmin(user: RequestUser | null | undefined, message = 'Admin access required'): void {
  if (!isAdmin(user)) throw new ForbiddenException(message);
}

export function assertRole(user: RequestUser | null | undefined, roles: string[], message?: string): void {
  if (!isRole(user, ...roles))
    throw new ForbiddenException(message ?? `Requires one of: [${roles.join(', ')}]`);
}

export function assertPermission(user: RequestUser | null | undefined, code: string, message?: string): void {
  if (!hasPermission(user, code))
    throw new ForbiddenException(message ?? `Permission '${code}' required`);
}

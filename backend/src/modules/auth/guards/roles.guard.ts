import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getEffectiveRole } from '../../../common/helpers/role-helper';

/**
 * RolesGuard — Phase 1 (Dual-read)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CHANGE FROM ORIGINAL
 * ────────────────────
 * Original:
 *   return requiredRoles.some((role) => user?.role === role);
 *   → reads ONLY user.role (legacy enum string)
 *
 * Phase 1:
 *   return requiredRoles.includes(getEffectiveRole(user));
 *   → reads dynamic role first (roleRelation.name / roleName), falls back to
 *     legacy user.role — works for all three migration states A/B/C
 *
 * The decorator API is 100% unchanged:
 *   @Roles('admin')
 *   @SetMetadata('roles', ['admin', 'manager'])
 * Both continue to work exactly as before.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles decorator → route is open to any authenticated user
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    // getEffectiveRole handles legacy, dual, and new-only states
    return required.includes(getEffectiveRole(user));
  }
}

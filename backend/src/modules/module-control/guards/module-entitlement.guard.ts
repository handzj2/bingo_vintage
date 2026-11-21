import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_MODULE_KEY } from '../decorators/require-module.decorator';
import { ModuleControlService } from '../module-control.service';

/**
 * Enforces commercial module access independently of RBAC.
 * - Does not replace PermissionGuard / roles.
 * - Superadmin bypasses tenant commercial gates (provider operations).
 * - Missing decorator → allow (only routes explicitly tagged are gated).
 */
@Injectable()
export class ModuleEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleControl: ModuleControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const keys = this.reflector.getAllAndOverride<string[]>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!keys || keys.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    const role = (user.roleName || user.role || '').toLowerCase();
    if (role === 'superadmin') return true;

    const tenantId = user.tenantId ?? user.tenant_id ?? null;

    for (const moduleKey of keys) {
      let allowed: boolean;
      try {
        allowed = await this.moduleControl.isAccessAllowed(tenantId, moduleKey);
      } catch {
        throw new ServiceUnavailableException(
          'Module entitlement service is temporarily unavailable.',
        );
      }
      if (!allowed) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'ModuleDisabled',
          message: `The module "${moduleKey}" is not available for your organisation. Contact your system administrator.`,
          moduleKey,
        });
      }
    }
    return true;
  }
}

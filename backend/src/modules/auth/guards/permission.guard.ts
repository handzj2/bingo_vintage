import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../../../common/helpers/role-helper';

export const PERMISSION_KEY = 'required_permission';
export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for single permission (old style)
    const singlePermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check for multiple permissions (new style)
    const multiplePermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!singlePermission && (!multiplePermissions || multiplePermissions.length === 0)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Unauthenticated');

    const required = [];
    if (singlePermission) required.push(singlePermission);
    if (multiplePermissions) required.push(...multiplePermissions);

    const hasAny = required.some(perm => hasPermission(user, perm));
    if (hasAny) return true;

    throw new ForbiddenException(`Required permission(s): ${required.join(', ')}`);
  }
}
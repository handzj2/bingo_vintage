import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req  = context.switchToHttp().getRequest();
    const user = req.user;
    const role = (user?.roleName ?? '').toLowerCase();
    if (role !== 'superadmin') {
      throw new ForbiddenException('Super admin access required.');
    }
    return true;
  }
}

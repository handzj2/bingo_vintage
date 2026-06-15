// RBAC patch 2026-06-15: cashier in BRANCH_REQUIRED_ROLES; superadmin exempt from tenant null check
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy }    from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService }       from '@nestjs/config';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { User }                from '../../users/entities/user.entity';

/**
 * PHASE 4.1 — Role-Aware Branch Enforcement
 *
 * Rules:
 *  1. tenantId must NEVER be null for any role — hard block.
 *  2. branchId is only required for branch-scoped operational roles
 *     (cashier, credit_officer, teller, branch_manager).
 *  3. Tenant-level roles (admin, super_admin, system_administrator, auditor)
 *     may have branchId = null and still authenticate successfully.
 *  4. No ?? 1 fallback anywhere — removed entirely.
 */

/** Roles that must have a branch_id assigned to operate.
 *  Cashiers are branch-bound — they can only operate within their assigned branch.
 *  A cashier account without a branch_id is invalid and must not authenticate. */
const BRANCH_REQUIRED_ROLES: readonly string[] = [
  'cashier',
  'credit_officer',
  'teller',
  'branch_manager',
];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const rows: any[] = await this.userRepo.manager.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.is_active             AS "isActive",
         u.role_id               AS "roleId",
         u.tenant_id             AS "tenantId",
         u.branch_id             AS "branchId",
         u.must_change_password  AS "mustChangePassword",
         r.name                  AS "roleName",
         STRING_AGG(rp.permission_code, ',' ORDER BY rp.permission_code) AS "permCodes"
       FROM   users u
       LEFT   JOIN roles r             ON r.id  = u.role_id
       LEFT   JOIN role_permissions rp ON rp.role_id = u.role_id
       WHERE  u.id = $1
       GROUP  BY u.id, u.username, u.email, u.is_active,
                 u.role_id, u.tenant_id, u.branch_id,
                 u.must_change_password, r.name`,
      [payload.sub],
    );

    if (!rows.length) throw new UnauthorizedException('Account not found');

    const row = rows[0];

    if (!row.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    }

    // Rule 1: tenantId must never be null UNLESS the user is a superadmin
    const isSuperAdmin = (row.roleName ?? '').toLowerCase() === 'superadmin';
    if (!row.tenantId && !isSuperAdmin) {
      throw new UnauthorizedException(
        'Your account is not assigned to a tenant. Contact your administrator.',
      );
    }

    const roleName: string = row.roleName ?? payload.roleName ?? 'unknown';
    if (roleName === 'unknown') {
      throw new UnauthorizedException(
        'Your account has no role assigned. Contact your administrator.',
      );
    }

    // Rule 2: branchId required only for branch-scoped operational roles
    const requiresBranch = BRANCH_REQUIRED_ROLES.includes(roleName.toLowerCase());
    if (requiresBranch && !row.branchId) {
      throw new UnauthorizedException(
        'Your account is not assigned to a branch. Contact your administrator.',
      );
    }

    const permissionSet = new Set<string>(
      row.permCodes ? row.permCodes.split(',').filter(Boolean) : [],
    );

    return {
      id:       row.id,
      userId:   row.id,
      sub:      payload.sub,
      username: row.username,
      email:    row.email,
      roleName,
      roleId:   row.roleId ?? null,
      roleRelation: { name: roleName, rolePermissions: [] },
      permissions:  permissionSet,
      tenantId: row.tenantId,
      branchId: row.branchId ?? null,   // null is valid for admin/super_admin/auditor
      mustChangePassword: row.mustChangePassword ?? false,
    };
  }
}

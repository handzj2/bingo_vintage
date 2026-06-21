// RBAC patch 2026-06-15: login response includes tenantId field
// patch 2026-06-21: login response also includes branchId — needed by
// branch-scoped pages (e.g. drawer overview) immediately after login,
// not just after the follow-up /auth/me refresh
import {
  Injectable, UnauthorizedException, ConflictException,
  Logger, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existingUser = await this.userRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existingUser) throw new ConflictException('Username or Email already exists');

    // Phase 4 — tenant_id is mandatory on registration.
    // Falling back to 1 silently assigns the user to the default tenant,
    // which is a cross-tenant contamination risk in multi-tenant deployments.
    const tenantId = (dto as any).tenant_id;
    if (!tenantId) {
      throw new BadRequestException(
        'tenant_id is required for registration. Contact your administrator.',
      );
    }

    // Verify the tenant actually exists before creating any user.
    const tenantRows: any[] = await this.userRepository.manager.query(
      `SELECT id FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    if (tenantRows.length === 0) {
      throw new BadRequestException(`Tenant #${tenantId} does not exist`);
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user          = new User();
    user.username       = dto.username;
    user.email          = dto.email;
    user.fullName       = dto.full_name;
    user.isActive       = true;
    user.password_hash  = hashed;
    user.tenantId       = tenantId;

    const roleId = dto.roleId ?? await this.resolveRoleId('cashier', tenantId);
    if (!roleId) {
      throw new BadRequestException(`Default role "cashier" not found for this tenant.`);
    }
    user.roleId = roleId;

    const savedUser        = await this.userRepository.save(user);
    const roleNameForJwt   = await this.getRoleName(roleId) ?? 'cashier';

    const payload = {
      sub:      savedUser.id,
      username: savedUser.username,
      email:    savedUser.email,
      roleName: roleNameForJwt,
    };

    const { password_hash, tempPasswordHash, ...userOut } = savedUser as any;
    return {
      user:         { ...userOut, roleName: roleNameForJwt },
      access_token: this.jwtService.sign(payload),
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.username }],
      relations: ['roleRelation'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // ── OTP check ──────────────────────────────────────────────────────
    let loginViaOTP = false;
    if (user.tempPasswordHash && user.tempPasswordExpiresAt) {
      const notExpired = new Date() < new Date(user.tempPasswordExpiresAt);
      const otpMatch   = await bcrypt.compare(dto.password, user.tempPasswordHash);
      if (otpMatch && notExpired) {
        loginViaOTP = true;
      } else if (otpMatch && !notExpired) {
        throw new UnauthorizedException(
          'Your one-time password has expired. Please request a new reset.',
        );
      }
    }

    if (!loginViaOTP) {
      const isValid = await user.verifyPassword(dto.password);
      if (!isValid) throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    }

    const mustChange = user.mustChangePassword || loginViaOTP;
    const roleName   = user.roleRelation?.name ?? 'unknown';

    const payload = {
      sub:               user.id,
      username:          user.username,
      email:             user.email,
      roleName,
      mustChangePassword: mustChange,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id:                 user.id,
        username:           user.username,
        email:              user.email,
        roleName,
        isActive:           user.isActive,
        fullName:           user.fullName,
        tenantId:           user.tenantId ?? null,   // needed by AuthContext on first login
        branchId:           user.branchId ?? null,   // needed by branch-scoped pages (e.g. drawer overview) on first login
        mustChangePassword: mustChange,
      },
    };
  }

  // ── Password Reset — Request (public, no auth) ────────────────────────────

  async requestPasswordReset(dto: { username: string; reason?: string }) {
    const user = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.username }],
    });
    // Don't reveal whether the account exists
    if (!user) {
      return { success: true, message: 'If this account exists, a reset request has been submitted.' };
    }

    const existing = await this.userRepository.manager.query(
      `SELECT id FROM password_reset_requests_v2 WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
      [user.id],
    );
    if (existing.length > 0) {
      return { success: true, message: 'A reset request is already pending admin review.' };
    }

    await this.userRepository.manager.query(
      `INSERT INTO password_reset_requests_v2 (user_id, status, reason, requested_at)
       VALUES ($1, 'pending', $2, NOW())`,
      [user.id, dto.reason || 'User forgot password'],
    );

    this.logger.log(`Password reset requested for user: ${user.username} (id: ${user.id})`);
    return { success: true, message: 'Reset request submitted. Please wait for admin approval.' };
  }

  // ── Password Reset — List (admin) ─────────────────────────────────────────

  async getPendingResetRequests() {
    return this.userRepository.manager.query(`
      SELECT
        prr.id,
        prr.status,
        prr.reason,
        prr.requested_at,
        prr.reviewed_at,
        prr.reviewed_by,
        u.id         AS user_id,
        u.username,
        u.email,
        u.full_name  AS full_name,
        rv.username  AS reviewed_by_name
      FROM password_reset_requests_v2 prr
      JOIN  users u  ON u.id  = prr.user_id
      LEFT JOIN users rv ON rv.id = prr.reviewed_by
      ORDER BY prr.requested_at DESC
    `);
  }

  // ── Password Reset — Approve (admin) ─────────────────────────────────────

  async approveResetRequest(requestId: number, adminId: number) {
    const [req] = await this.userRepository.manager.query(
      `SELECT * FROM password_reset_requests_v2 WHERE id = $1`,
      [requestId],
    );
    if (!req)                      throw new NotFoundException('Reset request not found');
    if (req.status !== 'pending')  throw new BadRequestException('Request is not pending');

    // 10-char OTP — no ambiguous chars (0/O/1/I)
    const chars    = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const otp      = Array.from(crypto.randomBytes(10)).map(b => chars[b % chars.length]).join('');
    const hashed   = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 h

    await this.userRepository.update(req.user_id, {
      tempPasswordHash:      hashed,
      tempPasswordExpiresAt: expiresAt,
      mustChangePassword:    true,
    } as any);

    await this.userRepository.manager.query(
      `UPDATE password_reset_requests_v2
       SET status='approved', reviewed_at=NOW(), reviewed_by=$1, temp_password=$2
       WHERE id=$3`,
      [adminId, otp, requestId],
    );

    this.logger.log(`Password reset approved for request ${requestId} by admin ${adminId}`);
    return {
      success:  true,
      otp,       // Admin sees this once and relays to the user
      expiresAt,
      message: 'One-time password generated. Share it with the user via phone or in person.',
    };
  }

  // ── Password Reset — Reject (admin) ──────────────────────────────────────

  async rejectResetRequest(requestId: number, adminId: number, reason?: string) {
    await this.userRepository.manager.query(
      `UPDATE password_reset_requests_v2
       SET status='rejected', reviewed_at=NOW(), reviewed_by=$1, reason=COALESCE($2, reason)
       WHERE id=$3`,
      [adminId, reason || null, requestId],
    );
    return { success: true, message: 'Reset request rejected.' };
  }

  // ── Password Reset — Set new password (user, after OTP login) ────────────

  async setNewPassword(userId: number, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    // Hash explicitly to avoid double-hash from @BeforeUpdate
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, {
      password_hash:         hashed,
      mustChangePassword:    false,
      tempPasswordHash:      null,
      tempPasswordExpiresAt: null,
    } as any);

    await this.userRepository.manager.query(
      `UPDATE password_reset_requests_v2
       SET status='completed', completed_at=NOW(), temp_password=NULL
       WHERE user_id=$1 AND status IN ('approved','pending')`,
      [userId],
    );

    this.logger.log(`Password successfully changed for user ${userId}`);
    return { success: true, message: 'Password updated successfully.' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveRoleId(roleName: string, tenantId: number): Promise<number | null> {
    try {
      const rows = await this.userRepository.manager.query(
        `SELECT id FROM roles WHERE name = $1 AND tenant_id = $2 LIMIT 1`,
        [roleName, tenantId],
      );
      return rows?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  private async getRoleName(roleId: number): Promise<string | null> {
    try {
      const rows = await this.userRepository.manager.query(
        `SELECT name FROM roles WHERE id = $1 LIMIT 1`,
        [roleId],
      );
      return rows?.[0]?.name ?? null;
    } catch {
      return null;
    }
  }
}

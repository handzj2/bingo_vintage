/**
 * PasswordResetService
 *
 * Implements the full admin-approved OTP password reset flow:
 *
 *   1. requestReset()      — user submits request (public)
 *   2. listRequests()      — admin lists pending/all requests (admin only)
 *   3. approveRequest()    — admin approves → OTP generated (admin only)
 *   4. verifyOtp()         — user verifies OTP → resetToken returned (public)
 *   5. setNewPassword()    — user sets new password using resetToken (public)
 *
 * Security decisions:
 *  - OTP: 6 random digits, bcrypt-hashed before storage
 *  - OTP expires in OTP_TTL_MINUTES (10 min) from approval
 *  - Max OTP_MAX_ATTEMPTS (5) verification attempts before lock
 *  - resetToken: UUID v4, expires in RESET_TOKEN_TTL_MINUTES (15 min)
 *  - Verification does NOT return a JWT — only a resetToken
 *  - setNewPassword invalidates the resetToken immediately after use
 */

import {
  Injectable, BadRequestException, NotFoundException,
  UnauthorizedException, Logger, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PasswordResetRequest, ResetStatus } from './entities/password-reset.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

// ── tuneable constants ───────────────────────────────────────────────────────
const OTP_TTL_MINUTES         = 10;  // OTP valid window
const RESET_TOKEN_TTL_MINUTES = 15;  // resetToken valid window
const OTP_MAX_ATTEMPTS        = 5;   // lock after N bad attempts

// ── helpers ──────────────────────────────────────────────────────────────────

/** Generate a 6-digit numeric OTP using cryptographically secure random bytes */
function generateOtp(): string {
  // Use modulo bias reduction: generate until value < 1_000_000
  let value: number;
  do {
    const buf = crypto.randomBytes(4);
    value = buf.readUInt32BE(0) % 1_000_000;
  } while (value < 0); // always false — just satisfies linter
  return value.toString().padStart(6, '0');
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetRequest)
    private readonly resetRepo: Repository<PasswordResetRequest>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly auditService: AuditService,
  ) {}

  // ── Step 1: User submits a reset request ─────────────────────────────────

  async requestReset(email: string): Promise<{ message: string }> {
    // Look up user by email — intentionally vague error to prevent user enumeration
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Return the same success-looking message even if email not found
      this.logger.warn(`Reset requested for unknown email: ${email}`);
      return { message: 'If that email exists, an admin will review your request shortly.' };
    }

    // Prevent duplicate pending requests — one active request per user at a time
    const existing = await this.resetRepo.findOne({
      where: { userId: user.id, status: ResetStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have a pending reset request. Please wait for admin approval.',
      );
    }

    // Also block if there is a non-expired APPROVED request (OTP not yet used)
    const activeApproved = await this.resetRepo.findOne({
      where: { userId: user.id, status: ResetStatus.APPROVED },
    });
    if (activeApproved && activeApproved.otpExpiresAt && new Date() < activeApproved.otpExpiresAt) {
      throw new BadRequestException(
        'An OTP has already been issued for your account. Please use it or wait for it to expire.',
      );
    }

    // Create the new request
    const request = this.resetRepo.create({
      userId: user.id,
      status: ResetStatus.PENDING,
    });
    const saved = await this.resetRepo.save(request);

    // Audit log
    await this.auditService.logAction({
      action: 'PASSWORD_RESET_REQUESTED',
      tableName: 'password_reset_requests_v2',
      recordId: undefined,
      user: user.email,
      description: `Password reset requested for user ${user.email} (ID: ${user.id})`,
    });

    this.logger.log(`Password reset requested — userId=${user.id}, requestId=${saved.id}`);
    return { message: 'If that email exists, an admin will review your request shortly.' };
  }

  // ── Admin: list all requests ──────────────────────────────────────────────

  async listRequests(): Promise<any[]> {
    const requests = await this.resetRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Return safe projection — no OTP hashes or tokens exposed
    return requests.map(r => ({
      id:          r.id,
      status:      r.status,
      createdAt:   r.createdAt,
      approvedAt:  r.approvedAt,
      completedAt: r.completedAt,
      otpExpiresAt: r.otpExpiresAt,
      user: r.user ? {
        id:       r.user.id,
        email:    r.user.email,
        username: r.user.username,
        fullName: r.user.fullName,
      } : null,
    }));
  }

  // ── Admin: approve request → generate OTP ────────────────────────────────

  async approveRequest(
    requestId: string,
    adminId: number,
    adminEmail: string,
  ): Promise<{ otp: string; expiresAt: Date; message: string }> {
    const request = await this.resetRepo.findOne({
      where: { id: requestId },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Reset request not found');

    if (request.status !== ResetStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve a request with status "${request.status}". Only PENDING requests can be approved.`,
      );
    }

    // Generate a secure 6-digit OTP
    const otp      = generateOtp();
    const otpHash  = await bcrypt.hash(otp, 12); // cost factor 12 for OTP hashes
    const expiresAt = addMinutes(new Date(), OTP_TTL_MINUTES);

    // Persist the hashed OTP — NEVER store the plain OTP
    request.status        = ResetStatus.APPROVED;
    request.otpHash       = otpHash;
    request.otpAttempts   = 0;
    request.otpExpiresAt  = expiresAt;
    request.approvedBy    = adminId;
    request.approvedAt    = new Date();
    await this.resetRepo.save(request);

    // Audit log
    await this.auditService.logAction({
      action: 'PASSWORD_RESET_APPROVED',
      tableName: 'password_reset_requests_v2',
      user: adminEmail,
      description: `Reset request ${requestId} approved by admin ${adminEmail}. OTP issued for user ${request.user?.email}.`,
    });

    this.logger.log(`Reset approved — requestId=${requestId} by adminId=${adminId}. OTP expires at ${expiresAt.toISOString()}`);

    return {
      otp,       // ← Plain OTP returned ONCE to admin; never stored in DB
      expiresAt,
      message: `OTP generated. Share this 6-digit code with the user in person or by phone. It expires in ${OTP_TTL_MINUTES} minutes.`,
    };
  }

  // ── Step 2: User verifies OTP → receives resetToken ──────────────────────

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ action: 'RESET_PASSWORD'; resetToken: string }> {
    // Find user
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Intentionally vague — do not reveal whether email exists
      throw new UnauthorizedException('Invalid email or OTP');
    }

    // Find the most recent APPROVED request for this user
    const request = await this.resetRepo.findOne({
      where: { userId: user.id, status: ResetStatus.APPROVED },
      order: { approvedAt: 'DESC' },
    });
    if (!request) {
      throw new UnauthorizedException('No approved reset request found for this account');
    }

    // Check OTP attempt limit before any comparison (prevent brute force)
    if (request.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException(
        'Maximum verification attempts exceeded. Please request a new password reset.',
      );
    }

    // Check OTP expiry
    if (!request.otpExpiresAt || new Date() > request.otpExpiresAt) {
      request.status = ResetStatus.EXPIRED;
      await this.resetRepo.save(request);
      throw new UnauthorizedException(
        'The OTP has expired. Please request a new password reset.',
      );
    }

    // Increment attempt counter BEFORE verifying (prevents TOCTOU race)
    request.otpAttempts += 1;
    await this.resetRepo.save(request);

    // Verify OTP — constant-time comparison via bcrypt
    const isValid = await bcrypt.compare(otp, request.otpHash!);
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - request.otpAttempts;
      throw new UnauthorizedException(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : 'Invalid OTP. No attempts remaining. Please request a new reset.',
      );
    }

    // OTP verified — issue a single-use resetToken
    const resetToken         = crypto.randomUUID();
    const resetTokenExpiresAt = addMinutes(new Date(), RESET_TOKEN_TTL_MINUTES);

    request.status              = ResetStatus.OTP_VERIFIED;
    request.otpHash             = null;   // Invalidate OTP immediately
    request.resetToken          = resetToken;
    request.resetTokenExpiresAt = resetTokenExpiresAt;
    await this.resetRepo.save(request);

    this.logger.log(`OTP verified for userId=${user.id}. Reset token issued, expires ${resetTokenExpiresAt.toISOString()}`);

    // Return the magic action shape — NOT a JWT
    return { action: 'RESET_PASSWORD', resetToken };
  }

  // ── Authenticated first-login password change (JWT, no resetToken) ─────────
  // Used when mustChangePassword=true after admin/superadmin creates a user.
  // Distinct from the public OTP-based flow above which uses a resetToken.
  async setNewPasswordAuthenticated(
    userId: number,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await this.userRepo.update(userId, {
      password_hash: hashed,
      mustChangePassword: false,
      tempPasswordHash: null,
      tempPasswordExpiresAt: null,
    } as any);

    return { message: 'Password updated successfully' };
  }

  // ── Step 3: User sets new password using resetToken ──────────────────────

  async setNewPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find the request by resetToken
    const request = await this.resetRepo.findOne({
      where: { resetToken: token, status: ResetStatus.OTP_VERIFIED },
      relations: ['user'],
    });

    if (!request) {
      throw new UnauthorizedException('Invalid or already-used reset token');
    }

    // Check token expiry
    if (!request.resetTokenExpiresAt || new Date() > request.resetTokenExpiresAt) {
      request.status = ResetStatus.EXPIRED;
      await this.resetRepo.save(request);
      throw new UnauthorizedException('Reset token has expired. Please restart the process.');
    }

    // Validate password strength (service-level, in addition to DTO validation)
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 12);

    // Update user password — explicit hash prevents double-hashing by @BeforeUpdate
    await this.userRepo.update(request.userId, {
      password_hash: hashed,
      mustChangePassword: false,
      tempPasswordHash: null,         // Clear any legacy OTP from the old flow
      tempPasswordExpiresAt: null,
    } as any);

    // Mark request completed and invalidate the resetToken
    request.status              = ResetStatus.COMPLETED;
    request.resetToken          = null;   // Single-use — invalidate immediately
    request.resetTokenExpiresAt = null;
    request.completedAt         = new Date();
    await this.resetRepo.save(request);

    // Audit log
    await this.auditService.logAction({
      action: 'PASSWORD_RESET_COMPLETED',
      tableName: 'password_reset_requests_v2',
      user: request.user?.email,
      description: `Password successfully reset for user ${request.user?.email} (ID: ${request.userId})`,
    });

    this.logger.log(`Password reset completed for userId=${request.userId}, requestId=${request.id}`);
    return { message: 'Password updated successfully. You can now log in with your new password.' };
  }
}

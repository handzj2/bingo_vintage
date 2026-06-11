/**
 * PasswordResetRequest Entity
 *
 * Tracks the full lifecycle of an admin-approved password reset request.
 *
 * Status flow:
 *   PENDING → APPROVED → OTP_VERIFIED → COMPLETED
 *   PENDING → EXPIRED  (admin never acts)
 *   APPROVED → EXPIRED (OTP window lapses before user verifies)
 *
 * Security notes:
 *  - otpHash     : bcrypt hash of the 6-digit OTP — plain OTP is NEVER persisted
 *  - resetToken  : single-use UUID v4 issued after OTP verification, NOT a JWT
 *  - Both are nulled out immediately after use
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// ── Status enum ───────────────────────────────────────────────────────────────

export enum ResetStatus {
  /** Request created by user, awaiting admin action */
  PENDING = 'PENDING',

  /** Admin approved — OTP generated and shared out-of-band */
  APPROVED = 'APPROVED',

  /** User successfully verified the OTP — resetToken issued */
  OTP_VERIFIED = 'OTP_VERIFIED',

  /** User set a new password — flow complete */
  COMPLETED = 'COMPLETED',

  /** OTP or resetToken window expired before use */
  EXPIRED = 'EXPIRED',
}

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity('password_reset_requests_v2')
@Index('idx_prr_v2_user_status', ['userId', 'status'])
export class PasswordResetRequest {
  // ── Primary key ────────────────────────────────────────────────────────────

  /** UUID — never expose sequential integer IDs for security-sensitive records */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Ownership ──────────────────────────────────────────────────────────────

  @Column({ name: 'user_id' })
  @Index('idx_prr_v2_user_id')
  userId: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ── Lifecycle status ───────────────────────────────────────────────────────

  @Column({
    type: 'varchar',
    length: 20,
    default: ResetStatus.PENDING,
  })
  status: ResetStatus;

  // ── OTP fields ─────────────────────────────────────────────────────────────

  /**
   * bcrypt hash (cost factor 12) of the 6-digit OTP.
   *
   * The plain OTP is returned once to the approving admin and is NEVER
   * written to the database. This column is nulled after successful
   * verification to prevent replay attacks.
   */
  @Column({ name: 'otp_hash', nullable: true, type: 'text' })
  otpHash: string | null;

  /**
   * Counts failed OTP verification attempts by the user.
   * The request is permanently locked after OTP_MAX_ATTEMPTS (5) failures.
   * Counter is incremented BEFORE bcrypt comparison to prevent TOCTOU races.
   */
  @Column({ name: 'otp_attempts', default: 0 })
  otpAttempts: number;

  /**
   * Hard expiry for the OTP — set to NOW() + 10 minutes at approval time.
   * Any verification attempt after this timestamp must be rejected.
   */
  @Column({ name: 'otp_expires_at', nullable: true, type: 'timestamp' })
  otpExpiresAt: Date | null;

  // ── Reset token fields ─────────────────────────────────────────────────────

  /**
   * Single-use UUID v4 token issued after successful OTP verification.
   *
   * The frontend receives this token and POSTs it to /auth/set-new-password.
   * It is NOT a JWT — it carries no claims and cannot access any other endpoint.
   * Nulled immediately after the password is set.
   */
  @Column({ name: 'reset_token', nullable: true, type: 'text' })
  @Index('idx_prr_v2_reset_token', { sparse: true })
  resetToken: string | null;

  /**
   * resetToken hard expiry — set to NOW() + 15 minutes at OTP verification time.
   */
  @Column({ name: 'reset_token_expires_at', nullable: true, type: 'timestamp' })
  resetTokenExpiresAt: Date | null;

  // ── Admin audit fields ─────────────────────────────────────────────────────

  /** ID of the admin/manager who approved this request */
  @Column({ name: 'approved_by', nullable: true, type: 'int' })
  approvedBy: number | null;

  /** Timestamp when the admin clicked "Approve & Issue OTP" */
  @Column({ name: 'approved_at', nullable: true, type: 'timestamp' })
  approvedAt: Date | null;

  // ── Completion ─────────────────────────────────────────────────────────────

  /** Timestamp when the user successfully set their new password */
  @Column({ name: 'completed_at', nullable: true, type: 'timestamp' })
  completedAt: Date | null;

  // ── Standard audit columns ─────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

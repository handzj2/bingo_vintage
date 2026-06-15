import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  BeforeInsert, BeforeUpdate,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../roles/entities/role.entity';

/**
 * SyncStatus — unchanged.
 * UserRole enum — DELETED in Phase 3. Import sites cleaned up separately.
 */
export enum SyncStatus {
  PENDING = 'pending',
  SYNCED  = 'synced',
  FAILED  = 'failed',
}

/**
 * User entity — Phase 3 (Clean)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CHANGES FROM PHASE 1/2
 * ─────────────────────
 * REMOVED:
 *   • `role` column (legacy VARCHAR enum) — column dropped from DB in V6 migration
 *   • UserRole enum import and definition
 *   • role fallback in effectiveRoleName getter
 *
 * KEPT:
 *   • roleId      — FK → roles.id  (required, not nullable after migration)
 *   • roleRelation — @ManyToOne to Role (eager loaded on auth path)
 *   • All other columns unchanged
 *
 * PREREQUISITE
 * ────────────
 * V6__drop_legacy_role_column.sql must be applied BEFORE deploying this entity:
 *   ALTER TABLE users DROP COLUMN IF EXISTS role;
 *
 * If the column still exists when this entity is deployed, TypeORM will
 * simply ignore it (synchronize:false). But reads expecting `user.role`
 * will return undefined — make sure Phase 2 is fully deployed first.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ unique: true })
  @ApiProperty()
  username: string;

  @Column({ name: 'password_hash', nullable: false })
  @Exclude()
  password_hash: string;

  @Column({ unique: true })
  @ApiProperty()
  email: string;

  @Column({ name: 'full_name', nullable: true })
  @ApiProperty()
  fullName: string;

  // ── Dynamic role (sole role system from Phase 3 onwards) ───────
  @Column({ name: 'role_id' })                  // NOT NULL after V6 migration
  roleId: number;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'role_id' })
  roleRelation: Role;
  // ──────────────────────────────────────────────────────────────

  @Column({ name: 'is_active', default: true })
  @ApiProperty()
  isActive: boolean;

  @Column({ name: 'sync_status', default: SyncStatus.PENDING })
  @ApiProperty({ enum: SyncStatus })
  syncStatus: SyncStatus;

  @Column({ name: 'last_login', nullable: true })
  @ApiProperty()
  lastLogin: Date;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  @ApiProperty()
  permissions: Record<string, boolean>;

  @Column({ name: 'tenant_id', nullable: true, default: 1 })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true, default: 1 })
  branchId: number;

  @Column({ name: 'must_change_password', default: false })
  @ApiProperty()
  mustChangePassword: boolean;

  @Column({ name: 'temp_password_hash', nullable: true, type: 'varchar' })
  @Exclude()
  tempPasswordHash: string | null;

  @Column({ name: 'temp_password_expires_at', nullable: true, type: 'timestamp' })
  @ApiProperty()
  tempPasswordExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password_hash && !this.password_hash.startsWith('$2b$')) {
      this.password_hash = await bcrypt.hash(this.password_hash, 10);
    }
  }

  get password(): string { return this.password_hash; }

  async verifyPassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.password_hash);
  }

  /**
   * effectiveRoleName — Phase 3 (simplified).
   * No legacy fallback needed — roleRelation is guaranteed to be set.
   */
  get effectiveRoleName(): string {
    return this.roleRelation?.name ?? 'unknown';
  }

  hasPermission(code: string): boolean {
    return (
      this.roleRelation?.rolePermissions?.some(
        (rp: any) => rp.permissionCode === code || rp.permission?.code === code,
      ) ?? false
    );
  }
}

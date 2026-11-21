import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('tenant_module_entitlements')
@Index(['tenantId', 'moduleKey'], { unique: true })
export class TenantModuleEntitlement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'module_key', length: 80 })
  moduleKey: string;

  @Column({ name: 'access_state', length: 20, default: 'ENABLED' })
  accessState: string;

  @Column({ name: 'visibility_state', length: 20, default: 'VISIBLE' })
  visibilityState: string;

  @Column({ name: 'commercial_status', length: 30, default: 'ACTIVE' })
  commercialStatus: string;

  @Column({ name: 'commercial_ref', length: 160, nullable: true })
  commercialRef: string | null;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'updated_by_id', nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

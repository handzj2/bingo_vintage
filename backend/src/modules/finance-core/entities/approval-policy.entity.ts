import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  Index, Unique,
} from 'typeorm';

/**
 * Maker-checker rules for new financial operations.
 * Safe default (D4): distinct approver required for every posting; no amount tiers yet.
 */
@Entity('approval_policies')
@Unique(['tenantId', 'operationType'])
@Index(['tenantId', 'isActive'])
export class ApprovalPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'operation_type', length: 64 })
  operationType: string;

  @Column({ name: 'requires_approval', default: true })
  requiresApproval: boolean;

  /** When true the creator cannot also be the approver. */
  @Column({ name: 'distinct_approver', default: true })
  distinctApprover: boolean;

  @Column({ name: 'min_approvers', default: 1 })
  minApprovers: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

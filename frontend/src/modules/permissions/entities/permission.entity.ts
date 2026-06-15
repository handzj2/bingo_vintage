import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type PermissionAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'approve' | 'reverse' | 'export';

/**
 * Permission — represents a single capability code.
 *
 * Schema (init.sql):
 *   id, code (UNIQUE), name, resource, action, description, tenant_id, created_at
 *
 * Example codes: 'loan.create', 'payment.reverse', 'report.export'
 */
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  /** Globally unique permission code. e.g. 'loan.create' */
  @Column({ unique: true, length: 80 })
  code: string;

  @Column({ length: 100 })
  name: string;

  /** The resource this permission governs — e.g. 'loan', 'payment', 'report' */
  @Column({ length: 50 })
  resource: string;

  /** CRUD-style action */
  @Column({ length: 20 })
  action: PermissionAction;

  @Column({ nullable: true, type: 'text' })
  description: string;

  /** NULL → system-wide; set → scoped to a tenant */
  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Role — dynamic per-tenant role (replaces the old UserRole string enum).
 *
 * Schema (init.sql):
 *   id, tenant_id, name, description, is_default, created_at, updated_at
 *   UNIQUE(tenant_id, name)
 */
@Entity('roles')
@Unique(['tenantId', 'name'])
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** Role name — e.g. 'admin', 'manager', 'cashier', 'agent' */
  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  /** If true, newly created users in this tenant inherit this role */
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  // ── Back-relations (loaded on demand) ────────────────────────
  // Circular imports: import lazily to avoid TypeORM bootstrap issues
  @OneToMany(() => require('../../permissions/entities/role-permission.entity').RolePermission, (rp: any) => rp.role)
  rolePermissions: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

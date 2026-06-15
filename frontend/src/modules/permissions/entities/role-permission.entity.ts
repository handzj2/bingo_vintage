import {
  Entity, PrimaryGeneratedColumn,
  ManyToOne, JoinColumn, Column,
  CreateDateColumn, Unique,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from './permission.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * RolePermission — grants a Permission to a Role.
 *
 * Schema (init.sql):
 *   id, role_id, permission_code, granted_at, granted_by, tenant_id
 *   UNIQUE(role_id, permission_code)
 */
@Entity('role_permissions')
@Unique(['roleId', 'permissionCode'])
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /** FK → permissions.code */
  @Column({ name: 'permission_code', length: 80 })
  permissionCode: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'permission_code', referencedColumnName: 'code' })
  permission: Permission;

  @Column({ name: 'granted_by', nullable: true })
  grantedBy: number | null;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @CreateDateColumn({ name: 'granted_at', type: 'timestamptz' })
  grantedAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('module_registry')
export class ModuleRegistry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_key', unique: true, length: 80 })
  moduleKey: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 60, default: 'business' })
  category: string;

  @Column({ name: 'parent_module_key', length: 80, nullable: true })
  parentModuleKey: string | null;

  @Column({ name: 'commercial_class', length: 40, default: 'core' })
  commercialClass: string;

  @Column({ name: 'is_independently_controllable', default: true })
  isIndependentlyControllable: boolean;

  @Column({ name: 'default_access_state', length: 20, default: 'ENABLED' })
  defaultAccessState: string;

  @Column({ name: 'default_visibility', length: 20, default: 'VISIBLE' })
  defaultVisibility: string;

  @Column({ name: 'backend_route_prefixes', type: 'text', array: true, nullable: true })
  backendRoutePrefixes: string[] | null;

  @Column({ name: 'frontend_route_prefixes', type: 'text', array: true, nullable: true })
  frontendRoutePrefixes: string[] | null;

  @Column({ name: 'permission_codes', type: 'text', array: true, nullable: true })
  permissionCodes: string[] | null;

  @Column({ name: 'sort_order', default: 100 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('module_access_history')
export class ModuleAccessHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_code', length: 60, default: 'bingo_vintage' })
  productCode: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @Column({ name: 'module_key', length: 80 })
  moduleKey: string;

  @Column({ length: 20 })
  scope: string;

  @Column({ name: 'previous_access_state', length: 20, nullable: true })
  previousAccessState: string | null;

  @Column({ name: 'new_access_state', length: 20, nullable: true })
  newAccessState: string | null;

  @Column({ name: 'previous_visibility', length: 20, nullable: true })
  previousVisibility: string | null;

  @Column({ name: 'new_visibility', length: 20, nullable: true })
  newVisibility: string | null;

  @Column({ name: 'previous_commercial', length: 30, nullable: true })
  previousCommercial: string | null;

  @Column({ name: 'new_commercial', length: 30, nullable: true })
  newCommercial: string | null;

  @Column({ name: 'actor_user_id', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'commercial_ref', length: 160, nullable: true })
  commercialRef: string | null;

  @Column({ length: 20, default: 'success' })
  result: string;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

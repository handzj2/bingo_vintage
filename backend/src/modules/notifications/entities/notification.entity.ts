import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('notifications')
@Index(['tenantId', 'userId', 'isRead'])
@Index(['tenantId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number | null;

  @Column({ length: 64 })
  type: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'link_path', length: 255, nullable: true })
  linkPath: string | null;

  @Column({ name: 'entity_type', length: 64, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', nullable: true })
  entityId: number | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

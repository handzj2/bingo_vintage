import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

@Entity('fin_categories')
@Unique(['tenantId', 'code'])
export class FinCategory {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ length: 32 }) code: string;
  @Column({ length: 120 }) name: string;
  @Column({ length: 30 }) kind: string;
  @Column({ name: 'on_behalf', default: false }) onBehalf: boolean;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('app_settings')
@Index(['key', 'tenantId'], { unique: true })   // (key, tenant_id) — replaces UNIQUE(key)
export class AppSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @Column('text')
  value: string;

  @Column({ nullable: true })
  description: string;

  // NULL = global / platform-level default (e.g. SMS API keys)
  // non-NULL = tenant-specific override (interest rate, late fee, etc.)
  @Column({ name: 'tenant_id', nullable: true, type: 'integer' })
  tenantId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

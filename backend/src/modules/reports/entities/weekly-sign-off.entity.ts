import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('weekly_sign_offs')
export class WeeklySignOff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number | null;

  @Column({ name: 'week_start', type: 'date' })
  weekStart: string;

  @Column({ name: 'week_end', type: 'date' })
  weekEnd: string;

  @Column({ length: 20, default: 'SIGNED' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'summary_json', type: 'jsonb', default: {} })
  summaryJson: Record<string, unknown>;

  @Column({ name: 'signed_by_id' })
  signedById: number;

  @Column({ name: 'signed_at', type: 'timestamptz' })
  signedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// src/modules/schedules/entities/alert.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';
import { LoanSchedule } from './schedule.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

@Entity('loan_alerts')
export class LoanAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'loan_id' })
  loanId: number;

  @ManyToOne(() => Loan, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: number;

  @ManyToOne(() => LoanSchedule, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'schedule_id' })
  schedule: LoanSchedule;

  // OVERDUE | DUE_TODAY | DUE_THIS_WEEK | MISSED_PAYMENT | DELINQUENT
  @Column({ name: 'alert_type' })
  alertType: string;

  // low | medium | high | critical
  @Column({ default: 'medium' })
  severity: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'days_overdue', default: 0 })
  daysOverdue: number;

  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2, default: 0 , transformer: new ColumnNumericTransformer() })
  amountDue: number;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

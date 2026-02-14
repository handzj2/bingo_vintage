// ENHANCED: src/modules/loans/entities/schedule.entity.ts
import { 
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, 
  JoinColumn, CreateDateColumn, UpdateDateColumn 
} from 'typeorm';
import { Loan } from './loan.entity';

export enum ScheduleStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
  WAIVED = 'waived',
  DEFAULTED = 'defaulted'
}

@Entity('loan_schedules')
export class LoanSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  // Schedule Details
  @Column({ name: 'loan_id' })
  loanId: number;

  @Column({ name: 'installment_number' })
  installmentNumber: number;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  // Amount Details
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'principal_amount' })
  principalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'interest_amount' })
  interestAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_due' })
  totalDue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'paid_amount' })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'penalty_amount' })
  penaltyAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'late_fee_amount' })
  lateFeeAmount: number;

  // Payment Details
  @Column({ nullable: true, name: 'paid_date' })
  paidDate: Date;

  @Column({ nullable: true, name: 'payment_method' })
  paymentMethod: string;

  @Column({ nullable: true, name: 'receipt_number' })
  receiptNumber: string;

  @Column({ nullable: true, name: 'payment_notes' })
  paymentNotes: string;

  // Status
  @Column({ 
    type: 'enum', 
    enum: ScheduleStatus, 
    default: ScheduleStatus.PENDING 
  })
  status: ScheduleStatus;

  @Column({ nullable: true, name: 'overdue_days' })
  overdueDays: number;

  // Relationships
  @ManyToOne(() => Loan, loan => loan.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ✅ ADDED: DUAL RECOGNITION for Reports (due_date)
  get due_date(): Date { return this.dueDate; }

  // Helper Methods
  get remainingAmount(): number {
    return this.totalDue - this.paidAmount;
  }

  get isOverdue(): boolean {
    return new Date() > this.dueDate && this.status === ScheduleStatus.PENDING;
  }

  get isFullyPaid(): boolean {
    return this.paidAmount >= this.totalDue;
  }
}
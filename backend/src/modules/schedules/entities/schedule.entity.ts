import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';

export enum ScheduleStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

@Entity('loan_schedules')
export class LoanSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan, (loan) => loan.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Column({ name: 'loan_id' })
  loanId: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for loan_id
  get loan_id(): number { return this.loanId; }
  set loan_id(value: number) { this.loanId = value; }

  @Column({ name: 'installment_number' })
  installmentNumber: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for installment_number
  get installment_number(): number { return this.installmentNumber; }
  set installment_number(value: number) { this.installmentNumber = value; }

  // ✅ FUTURE-PROOF: Code uses dueDate, DB uses due_date
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  // ✅ DUAL RECOGNITION: Snake-case alias for due_date
  get due_date(): Date { return this.dueDate; }
  set due_date(value: Date) { this.dueDate = value; }

  // ✅ FUTURE-PROOF: Code uses amountDue, DB uses amount_due
  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2 })
  amountDue: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for amount_due
  get amount_due(): number { return this.amountDue; }
  set amount_due(value: number) { this.amountDue = value; }

  @Column({ name: 'principal_due', type: 'decimal', precision: 12, scale: 2 })
  principalDue: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for principal_due
  get principal_due(): number { return this.principalDue; }
  set principal_due(value: number) { this.principalDue = value; }

  @Column({ name: 'interest_due', type: 'decimal', precision: 12, scale: 2 })
  interestDue: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for interest_due
  get interest_due(): number { return this.interestDue; }
  set interest_due(value: number) { this.interestDue = value; }

  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  // ✅ DUAL RECOGNITION: Snake-case alias for amount_paid
  get amount_paid(): number { return this.amountPaid; }
  set amount_paid(value: number) { this.amountPaid = value; }

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.PENDING
  })
  status: ScheduleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ✅ DUAL RECOGNITION: Snake-case alias for created_at
  get created_at(): Date { return this.createdAt; }
  set created_at(value: Date) { this.createdAt = value; }

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ✅ DUAL RECOGNITION: Snake-case alias for updated_at
  get updated_at(): Date { return this.updatedAt; }
  set updated_at(value: Date) { this.updatedAt = value; }

  // ✅ ADDITIONAL: Convenience getters for common calculations
  get is_overdue(): boolean {
    return this.status === ScheduleStatus.OVERDUE || 
           (this.status === ScheduleStatus.PENDING && new Date(this.dueDate) < new Date());
  }

  get remaining_amount(): number {
    return Math.max(0, this.amountDue - this.amountPaid);
  }

  get is_fully_paid(): boolean {
    return this.amountPaid >= this.amountDue || this.status === ScheduleStatus.PAID;
  }

  get is_partial(): boolean {
    return this.status === ScheduleStatus.PARTIAL || 
           (this.amountPaid > 0 && this.amountPaid < this.amountDue);
  }

  // ✅ Helper method to update payment
  recordPayment(amount: number): void {
    this.amountPaid += amount;
    
    if (this.amountPaid >= this.amountDue) {
      this.status = ScheduleStatus.PAID;
    } else if (this.amountPaid > 0) {
      this.status = ScheduleStatus.PARTIAL;
    }
    
    this.updatedAt = new Date();
  }

  // ✅ Helper method to check if schedule is pending
  get is_pending(): boolean {
    return this.status === ScheduleStatus.PENDING;
  }

  // ✅ Days overdue calculation
  get days_overdue(): number {
    if (!this.is_overdue) return 0;
    
    const today = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
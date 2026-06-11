// src/modules/schedules/entities/schedule.entity.ts
// ✅ CANONICAL schedule entity — always import from here, never from loans/entities/
// ✅ UPDATED: Added lastPenaltyApplied (used by PenaltyCalculationJob)
//             Added tenantId/branchId for multi-tenant
//             Added totalDue getter for backward compatibility
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';

export enum ScheduleStatus {
  PENDING   = 'PENDING',
  PAID      = 'PAID',
  PARTIAL   = 'PARTIAL',
  OVERDUE   = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  WAIVED    = 'WAIVED',
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

  get loan_id(): number { return this.loanId; }
  set loan_id(v: number) { this.loanId = v; }

  @Column({ name: 'installment_number' })
  installmentNumber: number;

  get installment_number(): number { return this.installmentNumber; }
  set installment_number(v: number) { this.installmentNumber = v; }

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  get due_date(): Date { return this.dueDate; }
  set due_date(v: Date) { this.dueDate = v; }

  // ── Core amounts ────────────────────────────────────────────
  @Column({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2 })
  amountDue: number;

  get amount_due(): number { return this.amountDue; }
  set amount_due(v: number) { this.amountDue = v; }

  /** Backward-compat alias used by Loan.getOverdueAmount() */
  get totalDue(): number { return this.amountDue; }

  @Column({ name: 'principal_due', type: 'decimal', precision: 12, scale: 2 })
  principalDue: number;

  get principal_due(): number { return this.principalDue; }
  set principal_due(v: number) { this.principalDue = v; }

  @Column({ name: 'interest_due', type: 'decimal', precision: 12, scale: 2 })
  interestDue: number;

  get interest_due(): number { return this.interestDue; }
  set interest_due(v: number) { this.interestDue = v; }

  @Column({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  get amount_paid(): number { return this.amountPaid; }
  set amount_paid(v: number) { this.amountPaid = v; }

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.PENDING,
  })
  status: ScheduleStatus;

  // ── Enterprise columns ──────────────────────────────────────
  @Column({ name: 'paid_date', type: 'timestamp', nullable: true })
  paidDate: Date;

  @Column({ name: 'receipt_number', nullable: true })
  receiptNumber: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_notes', type: 'text', nullable: true })
  paymentNotes: string;

  @Column({ name: 'overdue_days', default: 0 })
  overdueDays: number;

  get days_overdue(): number { return this.overdueDays; }

  @Column({ name: 'late_fee_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lateFeeAmount: number;

  @Column({ name: 'penalty_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  penaltyAmount: number;

  // ── PenaltyCalculationJob column ────────────────────────────
  @Column({ name: 'last_penalty_applied', type: 'date', nullable: true })
  lastPenaltyApplied: Date | null;
  // ──────────────────────────────────────────────────────────

  // ── Multi-tenant columns ────────────────────────────────────
  @Column({ name: 'tenant_id', nullable: true, default: 1 })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true, default: 1 })
  branchId: number;
  // ──────────────────────────────────────────────────────────

  // ── Timestamps ──────────────────────────────────────────────
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  get created_at(): Date { return this.createdAt; }
  set created_at(v: Date) { this.createdAt = v; }

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get updated_at(): Date { return this.updatedAt; }
  set updated_at(v: Date) { this.updatedAt = v; }

  // ── Computed helpers ────────────────────────────────────────
  get remaining_amount(): number {
    return Math.max(0, Number(this.amountDue) - Number(this.amountPaid || 0));
  }

  get is_fully_paid(): boolean {
    return Number(this.amountPaid) >= Number(this.amountDue) || this.status === ScheduleStatus.PAID;
  }

  get is_overdue(): boolean {
    return this.status === ScheduleStatus.OVERDUE ||
      (this.status === ScheduleStatus.PENDING && new Date(this.dueDate) < new Date());
  }

  get is_partial(): boolean {
    return this.status === ScheduleStatus.PARTIAL ||
      (Number(this.amountPaid) > 0 && Number(this.amountPaid) < Number(this.amountDue));
  }

  get is_pending(): boolean {
    return this.status === ScheduleStatus.PENDING;
  }

  recordPayment(amount: number): void {
    this.amountPaid = Number(this.amountPaid || 0) + amount;
    this.status = this.amountPaid >= this.amountDue
      ? ScheduleStatus.PAID
      : ScheduleStatus.PARTIAL;
    this.updatedAt = new Date();
  }
}

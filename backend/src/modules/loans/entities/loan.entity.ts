import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  JoinColumn, 
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn 
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Bike } from '../../bikes/entities/bike.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { LoanSchedule } from './schedule.entity'; 

// Loan status enumeration
export enum LoanStatus {
  PENDING = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Loans awaiting admin approval
  ACTIVE = 'ACTIVE',                    // Approved and active loans
  DELINQUENT = 'DELINQUENT',           // Overdue loans with late fees
  COMPLETED = 'COMPLETED',             // Successfully paid off
  DEFAULTED = 'DEFAULTED',             // Seriously delinquent
  CANCELLED = 'CANCELLED'              // Rejected or cancelled
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'loan_number', unique: true })
  loanNumber: string;

  // ✅ DUAL RECOGNITION: Snake-case alias for SyncService and legacy code
  get loan_number(): string { return this.loanNumber; }
  set loan_number(value: string) { this.loanNumber = value; }

  @ManyToOne(() => Client, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'principal_amount' })
  principalAmount: number;

  // ✅ DUAL RECOGNITION Alias
  get principal_amount(): number { return this.principalAmount; }
  set principal_amount(value: number) { this.principalAmount = value; }

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'interest_rate' })
  interestRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' })
  totalAmount: number;

  // ✅ DUAL RECOGNITION for SyncService (total_amount)
  get total_amount(): number { return this.totalAmount; }
  set total_amount(value: number) { this.totalAmount = value; }

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ name: 'term_months' })
  termMonths: number;

  // ✅ DUAL RECOGNITION for term_months
  get term_months(): number { return this.termMonths; }
  set term_months(value: number) { this.termMonths = value; }

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  // ✅ DUAL RECOGNITION for start_date
  get start_date(): Date { return this.startDate; }
  set start_date(value: Date) { this.startDate = value; }

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: Date;

  // ✅ DUAL RECOGNITION for end_date
  get end_date(): Date | null { return this.endDate; }
  set end_date(value: Date | null) { this.endDate = value; }

  @Column({ 
    type: 'enum', 
    enum: LoanStatus, 
    default: LoanStatus.PENDING_APPROVAL // Default: requires admin approval per Policy [2026-01-10]
  })
  status: LoanStatus;

  @ManyToOne(() => Bike, { nullable: true })
  @JoinColumn({ name: 'bike_id' })
  bike: Bike;

  @Column({ name: 'bike_id', nullable: true })
  bikeId: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => Payment, (payment) => payment.loan)
  payments: Payment[];

  @OneToMany(() => LoanSchedule, (schedule) => schedule.loan)
  schedules: LoanSchedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ✅ DUAL RECOGNITION for Reports (created_at)
  get created_at(): Date { return this.createdAt; }

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ✅ DUAL RECOGNITION for updated_at
  get updated_at(): Date { return this.updatedAt; }

  // ============= AUDIT & POLICY FIELDS [2026-01-10] =============

  @Column({ nullable: true, name: 'approved_by' })
  approvedBy: number;

  // ✅ DUAL RECOGNITION for approved_by
  get approved_by(): number | null { return this.approvedBy; }
  set approved_by(value: number | null) { this.approvedBy = value; }

  @Column({ nullable: true, name: 'approved_at' })
  approvedAt: Date;

  // ✅ DUAL RECOGNITION for approved_at
  get approved_at(): Date | null { return this.approvedAt; }
  set approved_at(value: Date | null) { this.approvedAt = value; }

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  // ✅ DUAL RECOGNITION for created_by
  get created_by(): number | null { return this.createdBy; }
  set created_by(value: number | null) { this.createdBy = value; }

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'processing_fee' })
  processingFee: number;

  // ✅ DUAL RECOGNITION for processing_fee
  get processing_fee(): number { return this.processingFee; }
  set processing_fee(value: number) { this.processingFee = value; }

  @DeleteDateColumn({ nullable: true, name: 'deleted_at' })
  deletedAt: Date;

  // ✅ DUAL RECOGNITION for deleted_at
  get deleted_at(): Date | null { return this.deletedAt; }
  set deleted_at(value: Date | null) { this.deletedAt = value; }

  @Column({ nullable: true, name: 'deleted_by' })
  deletedBy: number;

  // ✅ DUAL RECOGNITION for deleted_by
  get deleted_by(): number | null { return this.deletedBy; }
  set deleted_by(value: number | null) { this.deletedBy = value; }

  // ============= BUSINESS LOGIC & POLICY HELPERS =============

  /**
   * Only allows edits if the loan is still in PENDING or PENDING_APPROVAL status.
   * Once ACTIVE or DELINQUENT, it is locked for standard users per Policy [2026-01-10].
   */
  get isLocked(): boolean {
    return [LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.COMPLETED, LoanStatus.DEFAULTED].includes(this.status);
  }

  /**
   * Check if loan requires admin approval
   */
  get requiresApproval(): boolean {
    return this.status === LoanStatus.PENDING_APPROVAL;
  }

  /**
   * Check if loan can be approved (only in pending approval status)
   */
  get canBeApproved(): boolean {
    return this.status === LoanStatus.PENDING_APPROVAL;
  }

  /**
   * Check if loan is approved (active or completed)
   */
  get isApproved(): boolean {
    return [LoanStatus.ACTIVE, LoanStatus.COMPLETED, LoanStatus.DELINQUENT].includes(this.status);
  }

  /**
   * Check if loan is in a delinquent state (overdue)
   */
  get isDelinquent(): boolean {
    return this.status === LoanStatus.DELINQUENT;
  }

  /**
   * Check if loan is completed (fully paid)
   */
  get isCompleted(): boolean {
    return this.status === LoanStatus.COMPLETED;
  }

  /**
   * Check if loan is cancelled or rejected
   */
  get isCancelled(): boolean {
    return this.status === LoanStatus.CANCELLED;
  }

  // ============= FINANCIAL CALCULATIONS =============

  /**
   * Calculate remaining months of loan term
   */
  get remaining_months(): number {
    if (!this.startDate || !this.termMonths) return 0;
    const today = new Date();
    const start = new Date(this.startDate);
    
    const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 
      + (today.getMonth() - start.getMonth());
      
    return Math.max(0, this.termMonths - monthsDiff);
  }

  /**
   * Check if loan has been disbursed (funds released)
   */
  get is_disbursed(): boolean {
    return [LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.COMPLETED, LoanStatus.DEFAULTED].includes(this.status);
  }

  /**
   * Get disbursement date (if loan is disbursed)
   */
  get disbursement_date(): Date | null {
    return this.is_disbursed ? this.startDate : null;
  }

  /**
   * Calculate total interest paid so far
   */
  get total_interest_paid(): number {
    if (!this.payments) return 0;
    return this.payments.reduce((sum, payment) => sum + (payment.interestAmount || 0), 0);
  }

  /**
   * Calculate total principal paid so far
   */
  get total_principal_paid(): number {
    if (!this.payments) return 0;
    return this.payments.reduce((sum, payment) => sum + (payment.principalAmount || 0), 0);
  }

  /**
   * Calculate total payments made so far
   */
  get total_payments_made(): number {
    if (!this.payments) return 0;
    return this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }

  /**
   * Calculate monthly payment amount
   */
  get monthly_payment(): number {
    if (!this.termMonths || this.termMonths === 0) return 0;
    return Number((this.totalAmount / this.termMonths).toFixed(2));
  }

  // ============= OVERDUE CALCULATIONS =============

  /**
   * Check if loan is overdue based on end date or payment schedules
   */
  isOverdue(): boolean {
    if (![LoanStatus.ACTIVE, LoanStatus.DELINQUENT].includes(this.status)) return false;
    
    const today = new Date();
    
    // Check if end date has passed
    if (this.endDate && today > new Date(this.endDate)) return true;
    
    // Check if any payment schedule is overdue
    if (this.schedules && this.schedules.length > 0) {
      return this.schedules.some(schedule => {
        return schedule.status === 'pending' && new Date(schedule.dueDate) < today;
      });
    }
    
    return false;
  }

  /**
   * Calculate total overdue amount from pending schedules
   */
  getOverdueAmount(): number {
    if (!this.schedules) return 0;
    
    const today = new Date();
    return this.schedules
      .filter(s => s.status === 'pending' && new Date(s.dueDate) < today)
      .reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
  }

  /**
   * Calculate days overdue (based on most recent overdue payment)
   */
  getDaysOverdue(): number {
    if (!this.schedules) return 0;
    
    const today = new Date();
    const overdueSchedules = this.schedules
      .filter(s => s.status === 'pending' && new Date(s.dueDate) < today);
    
    if (overdueSchedules.length === 0) return 0;
    
    // Find the oldest overdue schedule
    const oldestOverdue = overdueSchedules.reduce((oldest, current) => {
      return new Date(current.dueDate) < new Date(oldest.dueDate) ? current : oldest;
    });
    
    const dueDate = new Date(oldestOverdue.dueDate);
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate loan-to-value ratio (for asset-backed loans)
   */
  get loan_to_value_ratio(): number | null {
    if (!this.bike || !this.bike.price) return null;
    return Number((this.principalAmount / this.bike.price).toFixed(2));
  }

  // ============= AUDIT & POLICY METHODS =============

  /**
   * Add audit note to loan (for Policy [2026-01-10] compliance)
   */
  addAuditNote(action: string, performedBy: string, details: string): void {
    const auditEntry = `
[${new Date().toISOString()}] - ${action}
Performed By: ${performedBy}
Details: ${details}
Policy Reference: [2026-01-10]
    `.trim();
    
    this.notes = this.notes 
      ? `${this.notes}\n\n${auditEntry}`
      : auditEntry;
  }

  /**
   * Approve loan (admin-only action)
   */
  approve(adminId: number, comments?: string): void {
    if (this.status !== LoanStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval loans can be approved');
    }
    
    this.status = LoanStatus.ACTIVE;
    this.approvedBy = adminId;
    this.approvedAt = new Date();
    
    this.addAuditNote(
      'LOAN_APPROVAL',
      `Admin ${adminId}`,
      `Loan approved${comments ? ` with comments: ${comments}` : ''}`
    );
  }

  /**
   * Reject loan (admin-only action)
   */
  reject(adminId: number, reason?: string): void {
    if (this.status !== LoanStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval loans can be rejected');
    }
    
    this.status = LoanStatus.CANCELLED;
    this.addAuditNote(
      'LOAN_REJECTION',
      `Admin ${adminId}`,
      `Loan rejected${reason ? `: ${reason}` : ''}`
    );
  }

  /**
   * Soft delete loan (admin-only action)
   */
  softDelete(deletedBy: number): void {
    this.deletedBy = deletedBy;
    this.deletedAt = new Date();
    this.status = LoanStatus.CANCELLED;
    
    this.addAuditNote(
      'LOAN_DELETION',
      `Admin ${deletedBy}`,
      'Loan soft deleted per Policy [2026-01-10]'
    );
  }

  // ============= VALIDATION METHODS =============

  /**
   * Validate loan data integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.loanNumber) errors.push('Loan number is required');
    if (!this.clientId) errors.push('Client ID is required');
    if (this.principalAmount <= 0) errors.push('Principal amount must be greater than 0');
    if (this.interestRate < 0) errors.push('Interest rate cannot be negative');
    if (this.termMonths <= 0) errors.push('Term months must be greater than 0');
    if (!this.startDate) errors.push('Start date is required');
    
    // Validate total amount calculation
    const expectedTotal = this.principalAmount * (1 + this.interestRate * this.termMonths / 12);
    if (Math.abs(this.totalAmount - expectedTotal) > 0.01) {
      errors.push(`Total amount calculation mismatch. Expected: ${expectedTotal.toFixed(2)}, Actual: ${this.totalAmount}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
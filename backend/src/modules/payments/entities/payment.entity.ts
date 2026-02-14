import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';
import { PaymentMethod } from '../../enums/payment-method.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan, (loan) => loan.payments, { onDelete: 'CASCADE' })
  loan: Loan;

  @Column({ name: 'loan_id' })
  loanId: number;

  // ⚡ FIX: Added 'amount' to match Loan Entity getter
  @Column('decimal', { precision: 12, scale: 2 })
  amount: number; 

  // ⚡ ADDED: Getter/Setter for backward compatibility
  // This allows old code to use .amountPaid while new code uses .amount
  get amountPaid(): number {
    return this.amount;
  }
  
  set amountPaid(value: number) {
    this.amount = value;
  }

  // ⚡ FIX: Added for Principal/Interest tracking required by the Loan Entity
  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'principal_amount' })
  principalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'interest_amount' })
  interestAmount: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ unique: true })
  receiptNumber: string;

  @CreateDateColumn()
  paymentDate: Date;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  // 🛡️ GOVERNANCE FIELDS [2026-01-10]
  @Column({ nullable: true })
  collectedBy: string;

  @Column({ nullable: true, name: 'reversed_at' })
  reversedAt: Date;

  @Column({ nullable: true, name: 'reversal_reason' })
  reversalReason: string;

  @Column({ nullable: true, name: 'reversed_by' })
  reversedBy: string;

  @Column({ nullable: true, name: 'policy_reference', default: '2026-01-10' })
  policyReference: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
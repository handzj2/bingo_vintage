import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { User }       from '../../users/entities/user.entity';
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { Loan }       from '../../loans/entities/loan.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

/**
 * Payment entity — aligned with the payments table in init.sql.
 *
 * FIXES vs previous broken version:
 *  1. Added loan relation + loanId FK  → fixes loan.entity.ts @OneToMany errors
 *  2. Added receiptNumber              → fixes 6x TS2353 in receipts.service.ts
 *  3. Added idempotencyKey             → fixes 2x TS2353 in payments.service.ts
 *  4. Added principalAmount + interestAmount → fixes loan.entity.ts getters
 *  5. Added reversedAt + reversalReason      → fixes reversal update block
 *  6. Added scheduleId                 → used in reversal + schedule apply
 *  7. Added transactionId, collectedBy, notes, reversedBy, policyReference
 *  8. Made cashDrawerId + branchId nullable
 *  9. createdById now nullable (no NOT NULL in DB)
 *
 * All columns exist in the DB (init.sql payments table).
 * No migration needed — just entity alignment.
 */
/** State machine for reversal workflow. */
export enum ReversalStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Tenant / branch ───────────────────────────────────────────────────────

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  // ── Loan relation ─────────────────────────────────────────────────────────

  @Column({ name: 'loan_id', nullable: true })
  loanId: number;

  @ManyToOne(() => Loan, (loan: any) => loan.payments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  // ── Schedule FK ───────────────────────────────────────────────────────────

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: number;

  // ── Core amounts ──────────────────────────────────────────────────────────

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 , transformer: new ColumnNumericTransformer() })
  amount: number;

  @Column({ name: 'principal_amount', type: 'decimal', precision: 12, scale: 2, default: 0 , transformer: new ColumnNumericTransformer() })
  principalAmount: number;

  @Column({ name: 'interest_amount', type: 'decimal', precision: 12, scale: 2, default: 0 , transformer: new ColumnNumericTransformer() })
  interestAmount: number;

  // ── Payment details ───────────────────────────────────────────────────────

  @Column({ name: 'payment_method', default: 'CASH' })
  paymentMethod: string;

  @Column({ name: 'payment_date', nullable: true })
  paymentDate: Date;

  @Column({ name: 'status', default: 'COMPLETED' })
  status: string;

  // ── Receipt / idempotency ─────────────────────────────────────────────────

  @Column({ name: 'receipt_number', nullable: true, unique: true })
  receiptNumber: string;

  @Column({ name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey: string;

  // ── Optional metadata ─────────────────────────────────────────────────────

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'collected_by', nullable: true })
  collectedBy: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  // ── Reversal ──────────────────────────────────────────────────────────────

  @Column({ name: 'reversed_at', nullable: true })
  reversedAt: Date;

  @Column({ name: 'reversal_reason', nullable: true })
  reversalReason: string;

  @Column({ name: 'reversed_by', nullable: true })
  reversedBy: string;

  @Column({ name: 'policy_reference', nullable: true, default: '2026-01-10' })
  policyReference: string;

  /**
   * Reversal state machine — replaces the policyReference flag pattern.
   * NULL  = no reversal in flight.
   * PENDING  = cashier requested; awaiting admin approval.
   * APPROVED = admin approved; reversal executed.
   * REJECTED = admin rejected the reversal request.
   */
  @Column({
    name:     'reversal_status',
    type:     'enum',
    enum:     ReversalStatus,
    nullable: true,
    default:  null,
  })
  reversalStatus: ReversalStatus | null;

  // ── Creator ───────────────────────────────────────────────────────────────

  @Column({ name: 'created_by_id', nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  // ── Cash drawer ───────────────────────────────────────────────────────────

  @Column({ name: 'cash_drawer_id', nullable: true })
  cashDrawerId: number;

  @ManyToOne(() => CashDrawer, { nullable: true })
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

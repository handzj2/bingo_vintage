/**
 * LedgerEntry entity
 *
 * Maps to the ledger_entries table created by migration_enterprise_engines.sql.
 *
 * Double-entry model (simplified — one row per financial event):
 *   LOAN_DISBURSEMENT  → debit  = loan.totalAmount   (money owed to us)
 *   LOAN_PAYMENT       → credit = payment.amount     (money received)
 *   PENALTY_CHARGE     → debit  = penalty accrued    (additional money owed)
 *   PAYMENT_REVERSAL   → debit  = reversed amount    (credit is cancelled)
 *   PENALTY_REVERSAL   → credit = reversed penalty
 *   EXPENSE            → debit  = expense amount     (money spent)
 *
 * balance_after is the loan balance AFTER this event (snapshot for fast reporting).
 * For non‑loan events (like expenses), balance_after is 0.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum LedgerTransactionType {
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_PAYMENT      = 'LOAN_PAYMENT',
  PENALTY_CHARGE    = 'PENALTY_CHARGE',
  PENALTY_REVERSAL  = 'PENALTY_REVERSAL',
  PAYMENT_REVERSAL  = 'PAYMENT_REVERSAL',
  FEE_CHARGE        = 'FEE_CHARGE',
  LOAN_WRITE_OFF    = 'LOAN_WRITE_OFF',
  EXPENSE           = 'EXPENSE',   // <-- ADDED
}

@Entity('ledger_entries')
@Index('idx_ledger_loan',   ['loanId',   'createdAt'])
@Index('idx_ledger_client', ['clientId', 'createdAt'])
export class LedgerEntry {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Foreign keys (stored as plain integers — no eager relations) ──────
  @Column({ name: 'loan_id', nullable: true }) // <-- made nullable
  loanId?: number;

  @Column({ name: 'client_id', nullable: true }) // <-- made nullable
  clientId?: number;

  // ── Transaction classification ─────────────────────────────────────────
  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: LedgerTransactionType,
  })
  transactionType: LedgerTransactionType;

  // ── Amounts (never both non-zero in the same row) ──────────────────────
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  debit: number;    // money flowing OUT of our pocket (disbursement / reversal)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  credit: number;   // money flowing IN (payment received / penalty reversed)

  /** Snapshot of loan.balance immediately AFTER this event */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'balance_after' })
  balanceAfter: number;

  // ── Narrative ──────────────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Receipt number, payment ID, schedule ID, etc. */
  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: number;

  // ── Multi-tenant columns ──────────────────────────────────────
  @Column({ name: 'tenant_id', nullable: true, default: 1 })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true, default: 1 })
  branchId: number;
  // ─────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
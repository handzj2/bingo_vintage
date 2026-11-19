import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

export enum FinTxnType {
  MONEY_IN = 'MONEY_IN',
  MONEY_OUT = 'MONEY_OUT',
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
  FINE = 'FINE',
  FIELD_COLLECTION = 'FIELD_COLLECTION',
  REMITTANCE = 'REMITTANCE',
  OTHER = 'OTHER',
}

export enum FinTxnStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('fin_transactions')
@Unique(['tenantId', 'idempotencyKey'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'txnDate'])
export class FinTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ type: 'enum', enum: FinTxnType }) type: FinTxnType;
  @Column({ type: 'enum', enum: FinTxnStatus, default: FinTxnStatus.DRAFT }) status: FinTxnStatus;
  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: new ColumnNumericTransformer() }) amount: number;
  @Column({ length: 3, default: 'UGX' }) currency: string;
  @Column({ name: 'category_id', nullable: true }) categoryId: number | null;
  @Column({ name: 'client_id', nullable: true }) clientId: number | null;
  @Column({ name: 'loan_id', nullable: true }) loanId: number | null;
  @Column({ name: 'reservation_id', nullable: true }) reservationId: number | null;
  @Column({ name: 'cash_drawer_id', nullable: true }) cashDrawerId: number | null;
  @Column({ name: 'from_account_id', nullable: true }) fromAccountId: number | null;
  @Column({ name: 'to_account_id', nullable: true }) toAccountId: number | null;
  @Column({ name: 'journal_id', nullable: true }) journalId: number | null;
  @Column({ length: 64 }) reference: string;
  @Column({ name: 'idempotency_key', length: 128 }) idempotencyKey: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'text', nullable: true }) reason: string | null;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @Column({ name: 'approved_by_id', nullable: true }) approvedById: number | null;
  @Column({ name: 'posted_by_id', nullable: true }) postedById: number | null;
  @Column({ name: 'reversed_by_id', nullable: true }) reversedById: number | null;
  @Column({ name: 'reversal_of_id', nullable: true }) reversalOfId: number | null;
  @Column({ name: 'txn_date', type: 'date' }) txnDate: string;
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true }) postedAt: Date | null;
  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true }) reversedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index, Unique,
} from 'typeorm';
import { FinJournalLine } from './fin-journal-line.entity';

export enum FinJournalStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum FinJournalType {
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT = 'LOAN_REPAYMENT',
  LOAN_REVERSAL = 'LOAN_REVERSAL',
  EXPENSE = 'EXPENSE',
  MONEY_IN = 'MONEY_IN',
  MONEY_OUT = 'MONEY_OUT',
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
  FINE = 'FINE',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING = 'OPENING',
  OTHER = 'OTHER',
}

@Entity('fin_journals')
@Unique(['tenantId', 'idempotencyKey'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'journalDate'])
@Index(['tenantId', 'reference'])
export class FinJournal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number | null;

  @Column({ length: 64 })
  reference: string;

  @Column({ type: 'enum', enum: FinJournalType, default: FinJournalType.OTHER })
  type: FinJournalType;

  @Column({ name: 'journal_date', type: 'date' })
  journalDate: string;

  @Column({ type: 'enum', enum: FinJournalStatus, default: FinJournalStatus.DRAFT })
  status: FinJournalStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'idempotency_key', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'source_module', length: 64, nullable: true })
  sourceModule: string | null;

  @Column({ name: 'source_id', nullable: true })
  sourceId: number | null;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: number | null;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: number | null;

  @Column({ name: 'posted_by_id', nullable: true })
  postedById: number | null;

  @Column({ name: 'reversed_by_id', nullable: true })
  reversedById: number | null;

  @Column({ name: 'reversal_of_id', nullable: true })
  reversalOfId: number | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt: Date | null;

  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @OneToMany(() => FinJournalLine, (line) => line.journal, { cascade: true })
  lines: FinJournalLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

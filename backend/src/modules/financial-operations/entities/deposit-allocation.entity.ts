import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

@Entity('deposit_allocations')
@Index(['depositId'])
export class DepositAllocation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'deposit_id' }) depositId: number;
  @Column({ name: 'loan_id', nullable: true }) loanId: number | null;
  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: new ColumnNumericTransformer() }) amount: number;
  @Column({ name: 'allocation_type', length: 30, default: 'DOWN_PAYMENT' }) allocationType: string;
  @Column({ name: 'fin_txn_id', nullable: true }) finTxnId: number | null;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

@Entity('remittance_batches')
export class RemittanceBatch {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ name: 'officer_id' }) officerId: number;
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) totalAmount: number;
  @Column({ length: 30, default: 'OPEN' }) status: string;
  @Column({ name: 'cash_drawer_id', nullable: true }) cashDrawerId: number | null;
  @Column({ name: 'fin_txn_id', nullable: true }) finTxnId: number | null;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt: Date | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt: Date | null;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

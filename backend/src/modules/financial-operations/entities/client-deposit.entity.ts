import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

export enum DepositStatus {
  HELD = 'HELD',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED = 'FULLY_ALLOCATED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity('client_deposits')
@Index(['tenantId', 'clientId'])
@Index(['tenantId', 'status'])
export class ClientDeposit {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ name: 'client_id' }) clientId: number;
  @Column({ name: 'reservation_id', nullable: true }) reservationId: number | null;
  @Column({ name: 'fin_txn_id', nullable: true }) finTxnId: number | null;
  @Column({ name: 'amount_received', type: 'decimal', precision: 15, scale: 2, transformer: new ColumnNumericTransformer() }) amountReceived: number;
  @Column({ name: 'amount_allocated', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) amountAllocated: number;
  @Column({ name: 'amount_refunded', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) amountRefunded: number;
  @Column({ type: 'enum', enum: DepositStatus, default: DepositStatus.HELD }) status: DepositStatus;
  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' }) receivedAt: Date;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  get available(): number {
    return Number(this.amountReceived) - Number(this.amountAllocated) - Number(this.amountRefunded);
  }
}

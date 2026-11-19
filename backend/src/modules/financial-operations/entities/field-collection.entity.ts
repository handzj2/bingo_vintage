import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

@Entity('field_collections')
@Index(['tenantId', 'officerId', 'status'])
export class FieldCollection {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ name: 'officer_id' }) officerId: number;
  @Column({ name: 'collection_date', type: 'date' }) collectionDate: string;
  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: new ColumnNumericTransformer() }) amount: number;
  @Column({ length: 30, default: 'HELD' }) status: string;
  @Column({ name: 'remittance_id', nullable: true }) remittanceId: number | null;
  @Column({ name: 'fin_txn_id', nullable: true }) finTxnId: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

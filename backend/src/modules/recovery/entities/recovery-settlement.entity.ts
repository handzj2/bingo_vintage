import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

/**
 * Settlement statement is a report snapshot.
 * offset_applied and write_off_amount default to 0 and are never auto-filled (D7/D8).
 */
@Entity('recovery_settlements')
@Index(['recoveryCaseId'])
export class RecoverySettlement {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'recovery_case_id' }) recoveryCaseId: number;
  @Column({ name: 'loan_id' }) loanId: number;
  @Column({ name: 'principal_outstanding', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) principalOutstanding: number;
  @Column({ name: 'accrued_interest', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) accruedInterest: number;
  @Column({ name: 'accrued_penalties', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) accruedPenalties: number;
  @Column({ name: 'total_outstanding', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) totalOutstanding: number;
  @Column({ name: 'frozen_interest', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) frozenInterest: number;
  @Column({ name: 'frozen_penalties', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) frozenPenalties: number;
  @Column({ name: 'frozen_total', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) frozenTotal: number;
  @Column({ name: 'bike_estimated_value', type: 'decimal', precision: 15, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() }) bikeEstimatedValue: number | null;
  @Column({ name: 'offset_applied', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) offsetApplied: number;
  @Column({ name: 'write_off_amount', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) writeOffAmount: number;
  @Column({ length: 30, default: 'DRAFT' }) status: string;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'prepared_by_id', nullable: true }) preparedById: number | null;
  @Column({ name: 'prepared_at', type: 'timestamptz', nullable: true }) preparedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

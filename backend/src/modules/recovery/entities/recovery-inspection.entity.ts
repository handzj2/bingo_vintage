import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

@Entity('recovery_inspections')
@Index(['recoveryCaseId'])
export class RecoveryInspection {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'recovery_case_id' }) recoveryCaseId: number;
  @Column({ name: 'inspected_at', type: 'timestamptz', default: () => 'now()' }) inspectedAt: Date;
  @Column({ name: 'inspected_by_id', nullable: true }) inspectedById: number | null;
  @Column({ name: 'condition_notes', type: 'text', nullable: true }) conditionNotes: string | null;
  @Column({ name: 'estimated_value', type: 'decimal', precision: 15, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() }) estimatedValue: number | null;
  @Column({ nullable: true }) odometer: number | null;
  @Column({ name: 'photos_count', default: 0 }) photosCount: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

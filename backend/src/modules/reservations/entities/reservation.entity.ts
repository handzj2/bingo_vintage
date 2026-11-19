import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

export enum ReservationStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  FINANCING_APPROVED = 'FINANCING_APPROVED',
  BIKE_ALLOCATED = 'BIKE_ALLOCATED',
  HANDED_OVER = 'HANDED_OVER',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'clientId'])
export class Reservation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ name: 'client_id' }) clientId: number;
  @Column({ name: 'bike_id', nullable: true }) bikeId: number | null;
  @Column({ length: 30, default: ReservationStatus.DRAFT }) status: string;
  @Column({ name: 'agreed_price', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) agreedPrice: number;
  @Column({ name: 'deposit_required', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) depositRequired: number;
  @Column({ name: 'deposit_received', type: 'decimal', precision: 15, scale: 2, default: 0, transformer: new ColumnNumericTransformer() }) depositReceived: number;
  @Column({ name: 'loan_id', nullable: true }) loanId: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ name: 'created_by_id', nullable: true }) createdById: number | null;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
  @Column({ name: 'cancelled_by_id', nullable: true }) cancelledById: number | null;
  @Column({ name: 'cancel_reason', type: 'text', nullable: true }) cancelReason: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

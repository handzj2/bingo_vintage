import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { LoanSchedule, ScheduleStatus } from '../../schedules/entities/schedule.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

/**
 * PaymentAllocation
 *
 * Records exactly what a payment did to a single loan_schedules row when
 * PaymentAllocationService.allocatePayment() distributes one payment across
 * multiple installments. One payment → many rows here, one per schedule row
 * it touched.
 *
 * Why this exists instead of a JSON column on payments: the relationship is
 * genuinely one-to-many (one payment can clear several installments), and
 * this table is what makes reversePayment() able to undo a multi-row
 * allocation precisely — subtract amount_applied from each schedule row and
 * restore previous_status — rather than only knowing about a single
 * schedule_id.
 *
 * Payments recorded before this table existed have no rows here.
 * reversePayment() must treat "no allocation rows found" as the signal to
 * fall back to the pre-existing single-schedule_id reversal path.
 */
@Entity('payment_allocations')
export class PaymentAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id' })
  paymentId: number;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'schedule_id' })
  scheduleId: number;

  @ManyToOne(() => LoanSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: LoanSchedule;

  @Column({
    name: 'amount_applied',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amountApplied: number;

  // The schedule row's status immediately before this allocation was
  // applied — what reversal restores it to (subject to the same
  // overdue-by-due-date recheck reversePayment() already does today).
  @Column({ name: 'previous_status', type: 'enum', enum: ScheduleStatus })
  previousStatus: ScheduleStatus;

  @Column({ name: 'new_status', type: 'enum', enum: ScheduleStatus })
  newStatus: ScheduleStatus;

  // Set when this allocation has been undone by a reversal. Kept (not
  // deleted) so the audit trail — "this payment touched this installment,
  // then it was reversed" — survives, matching the pattern payments.ts
  // already uses for reversal (reversedAt/reversalReason on Payment itself
  // rather than deleting the row).
  @Column({ name: 'reversed_at', type: 'timestamp', nullable: true })
  reversedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
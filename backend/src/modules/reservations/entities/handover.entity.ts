import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity('handovers')
@Unique(['loanId'])
@Index(['reservationId'])
export class Handover {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'reservation_id' }) reservationId: number;
  @Column({ name: 'loan_id' }) loanId: number;
  @Column({ name: 'bike_id' }) bikeId: number;
  @Column({ name: 'handed_over_at', type: 'timestamptz', default: () => 'now()' }) handedOverAt: Date;
  @Column({ name: 'handed_over_by', nullable: true }) handedOverBy: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

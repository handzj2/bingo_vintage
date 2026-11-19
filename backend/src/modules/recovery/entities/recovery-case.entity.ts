import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum RecoveryCaseStatus {
  OPEN = 'OPEN',
  AUTHORISED = 'AUTHORISED',
  IN_CUSTODY = 'IN_CUSTODY',
  INSPECTED = 'INSPECTED',
  SETTLEMENT_PREPARED = 'SETTLEMENT_PREPARED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('recovery_cases')
@Index(['tenantId', 'loanId'])
@Index(['tenantId', 'status'])
export class RecoveryCase {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'tenant_id' }) tenantId: number;
  @Column({ name: 'branch_id', nullable: true }) branchId: number | null;
  @Column({ name: 'loan_id' }) loanId: number;
  @Column({ name: 'client_id' }) clientId: number;
  @Column({ name: 'bike_id', nullable: true }) bikeId: number | null;
  @Column({ length: 30, default: RecoveryCaseStatus.OPEN }) status: string;
  @Column({ name: 'case_type', length: 40, default: 'REPOSSESSION' }) caseType: string;
  @Column({ name: 'authorised_by_id', nullable: true }) authorisedById: number | null;
  @Column({ name: 'authorised_at', type: 'timestamptz', nullable: true }) authorisedAt: Date | null;
  @Column({ name: 'authorisation_notes', type: 'text', nullable: true }) authorisationNotes: string | null;
  @Column({ name: 'opened_by_id', nullable: true }) openedById: number | null;
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true }) closedAt: Date | null;
  @Column({ name: 'closed_by_id', nullable: true }) closedById: number | null;
  @Column({ name: 'close_reason', type: 'text', nullable: true }) closeReason: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

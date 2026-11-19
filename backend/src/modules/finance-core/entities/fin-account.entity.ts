import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

/**
 * Tenant-scoped chart of accounts.
 * Seeded with a minimal editable set. Nothing posts until the accountant confirms (D1).
 */
export enum FinAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum FinAccountSubtype {
  CASH_DRAWER = 'CASH_DRAWER',
  BANK = 'BANK',
  OFFICER_HELD_CASH = 'OFFICER_HELD_CASH',
  CLIENT_DEPOSIT_LIABILITY = 'CLIENT_DEPOSIT_LIABILITY',
  DOWN_PAYMENT_RECEIVABLE = 'DOWN_PAYMENT_RECEIVABLE',
  FINES_INCOME = 'FINES_INCOME',
  OTHER_INCOME = 'OTHER_INCOME',
  FINES_PAYABLE = 'FINES_PAYABLE',
  GENERAL = 'GENERAL',
}

@Entity('fin_accounts')
@Unique(['tenantId', 'code'])
@Index(['tenantId', 'isActive'])
export class FinAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ length: 32 })
  code: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'enum', enum: FinAccountType })
  type: FinAccountType;

  @Column({ type: 'enum', enum: FinAccountSubtype, default: FinAccountSubtype.GENERAL })
  subtype: FinAccountSubtype;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** When subtype = CASH_DRAWER, points at the physical cash_drawers row. */
  @Column({ name: 'cash_drawer_id', nullable: true })
  cashDrawerId: number | null;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  currentBalance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

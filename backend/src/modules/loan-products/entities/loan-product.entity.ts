import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

export enum LoanProductType {
  CASH = 'cash',
  BIKE = 'bike',
}

export enum LoanInterestType {
  FLAT     = 'FLAT',
  // Declared now; no calculator in this codebase implements REDUCING yet.
  // Enabling it requires separately-approved business rules (repayment
  // frequency, amortization, rounding, fees, grace periods, early
  // settlement) and a new calculation implementation — not assumed here.
  REDUCING = 'REDUCING',
}

@Entity('loan_products')
export class LoanProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Short, stable identifier distinct from the human-editable `name` —
  // e.g. 'cash', 'side_loan'. Used by business-rule lookups; `name` is
  // free text the tenant can rename without affecting any logic.
  @Column({ nullable: true })
  code: string;

  @Column()
  name: string;

  // Groups products for cross-product business rules (e.g. "requires an
  // active loan in the cash category") without hardcoding a specific
  // product's name or id in that rule's implementation.
  @Column({ nullable: true })
  category: string;

  @Column({
    type: 'enum',
    enum: LoanProductType,
    default: LoanProductType.CASH,
    name: 'product_type',
  })
  productType: LoanProductType;

  @Column({
    type: 'enum',
    enum: LoanInterestType,
    default: LoanInterestType.FLAT,
    name: 'interest_type',
  })
  interestType: LoanInterestType;

  // How this product's schedule is actually computed (e.g.
  // 'monthly_flat', 'weekly_flat') — lets the loan-creation engine resolve
  // behavior from data instead of branching on productType.
  @Column({ name: 'calculation_method', nullable: true })
  calculationMethod: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'interest_rate', default: 0.15 , transformer: new ColumnNumericTransformer() })
  interestRate: number;

  @Column({ name: 'min_term_months', default: 1 })
  minTermMonths: number;

  @Column({ name: 'max_term_months', default: 60 })
  maxTermMonths: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'min_amount', default: 0 , transformer: new ColumnNumericTransformer() })
  minAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'max_amount', nullable: true , transformer: new ColumnNumericTransformer() })
  maxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'processing_fee', default: 0 , transformer: new ColumnNumericTransformer() })
  processingFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'late_fee_daily', default: 1000 , transformer: new ColumnNumericTransformer() })
  lateFeeDaily: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Defaults to true, matching every existing loan-creation path's current
  // behavior (all loans currently start PENDING_APPROVAL).
  @Column({ name: 'requires_approval', default: true })
  requiresApproval: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

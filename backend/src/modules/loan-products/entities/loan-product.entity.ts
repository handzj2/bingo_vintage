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

@Entity('loan_products')
export class LoanProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: LoanProductType,
    default: LoanProductType.CASH,
    name: 'product_type',
  })
  productType: LoanProductType;

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

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

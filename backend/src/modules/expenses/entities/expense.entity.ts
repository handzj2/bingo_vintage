import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { ExpenseCategory } from './expense-category.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => ExpenseCategory)
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;

  @Column({ name: 'amount', type: 'decimal', precision: 15, scale: 2 , transformer: new ColumnNumericTransformer() })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'payment_method', length: 50 })
  paymentMethod: string;

  @Column({ name: 'cash_drawer_id', nullable: true })
  cashDrawerId: number;

  @ManyToOne(() => CashDrawer, { nullable: true })
  @JoinColumn({ name: 'cash_drawer_id' })
  cashDrawer: CashDrawer;

  @Column({
    type: 'enum',
    enum: ExpenseStatus,
    default: ExpenseStatus.PENDING,
  })
  status: ExpenseStatus;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
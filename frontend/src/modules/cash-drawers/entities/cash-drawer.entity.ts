import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Expense } from '../../expenses/entities/expense.entity';

@Entity('cash_drawers')
export class CashDrawer {
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

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'drawer_date', type: 'date' })
  drawerDate: Date;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 15, scale: 2, nullable: true })
  closingBalance: number;

  @Column({ name: 'expected_balance', type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedBalance: number;

  @Column({ name: 'difference', type: 'decimal', precision: 15, scale: 2, nullable: true })
  difference: number;

  @Column({ length: 20, default: 'open' })
  status: string; // open, closed, reconciled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt: Date;

  @OneToMany(() => Payment, payment => payment.cashDrawer)
  payments: Payment[];

  @OneToMany(() => Expense, expense => expense.cashDrawer)
  expenses: Expense[];
}
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant }     from '../../tenants/entities/tenant.entity';
import { Branch }     from '../../branches/entities/branch.entity';
import { CashDrawer } from '../../cash-drawers/entities/cash-drawer.entity';
import { User }       from '../../users/entities/user.entity';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';

/**
 * PHASE 1 (Revised) — Reconciliation entity
 *
 * The `difference` column in migration 1700000000002 is a plain DECIMAL(15,2),
 * NOT a GENERATED ALWAYS column (that was only in the legacy fix_missing_tables.sql).
 * The migration is authoritative — difference is writable and must be mapped as @Column.
 * The service calculates it and writes it explicitly.
 */
@Entity('office_reconciliations')
export class Reconciliation {
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

  @Column({ name: 'drawer_id' })
  drawerId: number;

  @ManyToOne(() => CashDrawer)
  @JoinColumn({ name: 'drawer_id' })
  drawer: CashDrawer;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'expected_cash', type: 'decimal', precision: 15, scale: 2 , transformer: new ColumnNumericTransformer() })
  expectedCash: number;

  @Column({ name: 'actual_cash', type: 'decimal', precision: 15, scale: 2 , transformer: new ColumnNumericTransformer() })
  actualCash: number;

  /** Written by service: actual_cash - expected_cash */
  @Column({ name: 'difference', type: 'decimal', precision: 15, scale: 2 , transformer: new ColumnNumericTransformer() })
  difference: number;

  @Column({ name: 'reconciled_at' })
  reconciledAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

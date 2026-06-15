import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Reconciliation }   from './entities/reconciliation.entity';
import { CashDrawer }       from '../cash-drawers/entities/cash-drawer.entity';
import { Payment }          from '../payments/entities/payment.entity';
import { Expense }          from '../expenses/entities/expense.entity';
import { RequestUser }      from '../../common/helpers/role-helper';

/**
 * PHASE 8 — ReconciliationService
 * PHASE 4.1 — Role-Aware Branch Enforcement
 *
 * Fixes:
 *  FIX-R01: All lookups include tenantId (was findOne({id}) — cross-tenant leak)
 *  FIX-R02: Drawer set to 'reconciled' after reconciliation — locks further ops
 *  FIX-R03: Expected cash formula: opening + collections - expenses
 *  FIX-R04: difference written as plain column (migration 002 is authoritative, not fix_missing_tables.sql)
 *  FIX-R05 (4.1): branchId required for financial write — no ?? fallback
 */
@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(Reconciliation) private reconRepo:   Repository<Reconciliation>,
    @InjectRepository(CashDrawer)     private drawerRepo:  Repository<CashDrawer>,
    @InjectRepository(Payment)        private paymentRepo: Repository<Payment>,
    @InjectRepository(Expense)        private expenseRepo: Repository<Expense>,
  ) {}

  // ── Calculate expected cash for a drawer ────────────────────────────────────
  async getExpected(drawerId: number, tenantId: number): Promise<{ expected: number }> {
    // FIX-R01: tenant isolation
    const drawer = await this.drawerRepo.findOne({ where: { id: drawerId, tenantId } });
    if (!drawer) throw new NotFoundException('Cash drawer not found');

    const payRow = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.cashDrawerId = :drawerId', { drawerId })
      .andWhere('p.status != :rev', { rev: 'REVERSED' })
      .select('COALESCE(SUM(p.amount),0)', 'sum')
      .getRawOne();

    const expRow = await this.expenseRepo
      .createQueryBuilder('e')
      .where('e.cashDrawerId = :drawerId', { drawerId })
      .andWhere('e.status = :approved', { approved: 'approved' })
      .select('COALESCE(SUM(e.amount),0)', 'sum')
      .getRawOne();

    const expected =
      Number(drawer.openingBalance) +
      Number(payRow?.sum ?? 0) -
      Number(expRow?.sum ?? 0);

    return { expected };
  }

  // ── Create reconciliation ────────────────────────────────────────────────────
  async create(
    dto: { drawerId: number; actualCash: number },
    user: RequestUser,
  ): Promise<Reconciliation> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned');

    // PHASE 4.1: financial writes require branch assignment
    // Phase 3.4: admin/super_admin operate tenant-wide — branchId not required
    const isAdmin = ['admin', 'super_admin'].includes((user as any).roleName?.toLowerCase() || '');
    if (!isAdmin && !user.branchId) {
      throw new ForbiddenException(
        'Branch assignment required for financial operations.',
      );
    }

    // FIX-R01: tenant isolation
    const drawer = await this.drawerRepo.findOne({
      where: { id: dto.drawerId, tenantId: user.tenantId },
    });
    if (!drawer) throw new NotFoundException('Cash drawer not found');

    if (drawer.status === 'reconciled') {
      throw new BadRequestException('Drawer has already been reconciled');
    }
    if (drawer.status !== 'closed') {
      throw new BadRequestException('Drawer must be closed before reconciliation');
    }

    const { expected } = await this.getExpected(dto.drawerId, user.tenantId);

    // Migration 1700000000002 creates `difference` as a plain writable column.
    // Service calculates and writes it explicitly.
    const difference = Number(dto.actualCash) - Number(expected);

    const recon = this.reconRepo.create({
      tenantId:     user.tenantId,
      branchId:     user.branchId,
      drawerId:     dto.drawerId,
      createdById:  user.userId,
      expectedCash: expected,
      actualCash:   dto.actualCash,
      difference,
      reconciledAt: new Date(),
    });

    const saved = await this.reconRepo.save(recon);

    // FIX-R02: lock drawer after reconciliation
    drawer.status = 'reconciled';
    await this.drawerRepo.save(drawer);

    return saved;
  }

  // ── List reconciliations (with optional branchId + drawerId filters) ──────────
  async findAll(tenantId: number, branchId?: number, drawerId?: number): Promise<Reconciliation[]> {
    const qb = this.reconRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.drawer',    'drawer')
      .leftJoinAndSelect('r.createdBy', 'user')
      .where('r.tenant_id = :tenantId', { tenantId });

    if (branchId) qb.andWhere('r.branch_id = :branchId', { branchId });
    if (drawerId) qb.andWhere('r.drawer_id = :drawerId', { drawerId });

    return qb.orderBy('r.reconciled_at', 'DESC').getMany();
  }
}

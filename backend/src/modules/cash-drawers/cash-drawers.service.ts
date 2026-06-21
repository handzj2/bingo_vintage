import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { CashDrawer }       from './entities/cash-drawer.entity';
import { Payment }          from '../payments/entities/payment.entity';
import { Expense }          from '../expenses/entities/expense.entity';
import { getUserId, RequestUser } from '../../common/helpers/role-helper';

/**
 * PHASE 7 — CashDrawerService
 * PHASE 4.1 — Role-Aware Branch Enforcement
 *
 * Fixes applied:
 *  FIX-CD01: State guards — prevents ops on closed/reconciled drawers
 *  FIX-CD02: currentBalance tracked on every open drawer
 *  FIX-CD03: expectedBalance = opening + collections - expenses (correct formula)
 *  FIX-CD04: Tenant isolation on all lookups
 *  FIX-CD05: close() uses cash_drawer_id FK on payments
 *  FIX-CD06 (4.1): branchId required before any financial write — no ?? fallback
 */
@Injectable()
export class CashDrawerService {
  constructor(
    @InjectRepository(CashDrawer) private drawerRepo:  Repository<CashDrawer>,
    @InjectRepository(Payment)    private paymentRepo:  Repository<Payment>,
    @InjectRepository(Expense)    private expenseRepo:  Repository<Expense>,
  ) {}

  // ── Open drawer ─────────────────────────────────────────────────────────────
  async open(user: RequestUser, openingBalance: number): Promise<CashDrawer> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned to your account');

    // PHASE 4.1: financial writes require branch assignment
    // Phase 3.4: admin/super_admin operate tenant-wide — branchId not required
    const isAdmin = ['admin', 'super_admin'].includes((user as any).roleName?.toLowerCase() || '');
    if (!isAdmin && !user.branchId) {
      throw new ForbiddenException(
        'Branch assignment required for financial operations.',
      );
    }

    const existing = await this.drawerRepo.findOne({
      where: { userId: getUserId(user), tenantId: user.tenantId, status: 'open' },
    });
    if (existing) throw new BadRequestException('You already have an open drawer');

    const drawer = this.drawerRepo.create({
      tenantId:       user.tenantId,
      branchId:       user.branchId,
      userId:         getUserId(user),
      openingBalance,
      currentBalance: openingBalance,
      drawerDate:     new Date(),
      status:         'open',
    });
    return this.drawerRepo.save(drawer);
  }

  // ── Get current open drawer for user ────────────────────────────────────────
  async getCurrent(userId: number, tenantId: number): Promise<CashDrawer> {
    if (!tenantId) throw new ForbiddenException('No tenant assigned');
    const drawer = await this.drawerRepo.findOne({
      where: { userId, tenantId, status: 'open' },
      relations: ['user', 'branch'],
    });
    if (!drawer) throw new NotFoundException('No open drawer found');
    return drawer;
  }

  // ── Get single drawer ────────────────────────────────────────────────────────
  async findOne(id: number, tenantId: number): Promise<CashDrawer> {
    const drawer = await this.drawerRepo.findOne({
      where: { id, tenantId },
      relations: ['user', 'branch'],
    });
    if (!drawer) throw new NotFoundException('Cash drawer not found');
    return drawer;
  }

  // ── List all drawers for tenant ──────────────────────────────────────────────
  // Phase 5.1 (complete): branchId + userId filters now accepted
  async findAll(
    tenantId: number,
    status?:   string,
    branchId?: number,
    userId?:   number,
  ): Promise<CashDrawer[]> {
    const qb = this.drawerRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.user',   'user')
      .leftJoinAndSelect('d.branch', 'branch')
      .where('d.tenant_id = :tenantId', { tenantId });

    if (status)   qb.andWhere('d.status    = :status',   { status });
    if (branchId) qb.andWhere('d.branch_id = :branchId', { branchId });
    if (userId)   qb.andWhere('d.user_id   = :userId',   { userId });

    return qb.orderBy('d.created_at', 'DESC').getMany();
  }

  // ── Close drawer ─────────────────────────────────────────────────────────────
  async close(drawerId: number, user: RequestUser, actualCash: number): Promise<CashDrawer> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned');

    // PHASE 4.1: financial writes require branch assignment
    // Phase 3.4: admin/super_admin operate tenant-wide — branchId not required
    const isAdmin = ['admin', 'super_admin'].includes((user as any).roleName?.toLowerCase() || '');
    if (!isAdmin && !user.branchId) {
      throw new ForbiddenException(
        'Branch assignment required for financial operations.',
      );
    }

    const drawer = await this.drawerRepo.findOne({
      where: { id: drawerId, tenantId: user.tenantId },
    });
    if (!drawer) throw new NotFoundException('Drawer not found');

    // FIX-CD01: state guard
    if (drawer.status !== 'open') {
      throw new BadRequestException(`Drawer is already ${drawer.status}. Cannot close.`);
    }
    if (drawer.userId !== getUserId(user)) {
      throw new ForbiddenException('You can only close your own drawer');
    }

    // FIX-CD03: sum collections linked to this drawer
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

    const collections = Number(payRow?.sum ?? 0);
    const expenses    = Number(expRow?.sum  ?? 0);
    const expectedBal = Number(drawer.openingBalance) + collections - expenses;

    drawer.closingBalance  = actualCash;
    drawer.expectedBalance = expectedBal;
    drawer.difference      = actualCash - expectedBal;
    drawer.currentBalance  = actualCash;
    drawer.status          = 'closed';
    drawer.closedAt        = new Date();

    return this.drawerRepo.save(drawer);
  }

  // ── Guard: reject payment/expense against non-open drawer ───────────────────
  async assertOpen(drawerId: number, tenantId: number): Promise<CashDrawer> {
    const drawer = await this.findOne(drawerId, tenantId);
    if (drawer.status !== 'open') {
      throw new BadRequestException(
        `Cash drawer #${drawerId} is ${drawer.status}. Operations not allowed.`,
      );
    }
    return drawer;
  }

  // ── Task 4.2/REG-03: Authoritative balance mutation API ──────────────────────
  // All balance changes must flow through deduct() or add().
  // Called by ExpensesService.approve() for cash expenses.

  async deduct(drawerId: number, amount: number, description: string): Promise<void> {
    await this.drawerRepo.decrement({ id: drawerId }, 'currentBalance', amount);
  }

  async add(drawerId: number, amount: number, description: string): Promise<void> {
    await this.drawerRepo.increment({ id: drawerId }, 'currentBalance', amount);
  }

  async getSummary(drawerId: number, tenantId: number) {
    const drawer = await this.findOne(drawerId, tenantId);

    const payRow = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.cashDrawerId = :drawerId', { drawerId })
      .andWhere('p.status != :rev', { rev: 'REVERSED' })
      .select('COALESCE(SUM(p.amount),0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .getRawOne();

    const expRow = await this.expenseRepo
      .createQueryBuilder('e')
      .where('e.cashDrawerId = :drawerId', { drawerId })
      .andWhere('e.status = :approved', { approved: 'approved' })
      .select('COALESCE(SUM(e.amount),0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .getRawOne();

    const totalPayments   = Number(payRow?.total ?? 0);
    const totalExpenses   = Number(expRow?.total ?? 0);
    const paymentCount    = Number(payRow?.count ?? 0);
    const expenseCount    = Number(expRow?.count ?? 0);
    const expectedBalance = Number(drawer.openingBalance) + totalPayments - totalExpenses;

    return {
      drawer, totalPayments, totalExpenses, expectedBalance,
      currentBalance: Number(drawer.currentBalance),
      paymentCount, expenseCount,
      transactionCount: paymentCount + expenseCount,
    };
  }

  // ── Bulk summary for all open drawers at a branch ───────────────────────────
  // Used by the branch drawer-overview page: one row per cashier, side by side,
  // showing today's transaction count and running balance for accountability.
  async getOpenDrawerSummaries(tenantId: number, branchId?: number) {
    const drawers = await this.findAll(tenantId, 'open', branchId);
    return Promise.all(
      drawers.map(d => this.getSummary(d.id, tenantId)),
    );
  }
}

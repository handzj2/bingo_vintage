import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager }       from 'typeorm';
import { CashDrawer }       from './entities/cash-drawer.entity';
import { Payment }          from '../payments/entities/payment.entity';
import { Expense }          from '../expenses/entities/expense.entity';
import { getUserId, RequestUser, getEffectiveRole } from '../../common/helpers/role-helper';
import { startOfKampalaDay } from '../../common/utils/kampala-time';

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
 *
 * patch 2026-06-21: getSummary() now also returns paymentCount/expenseCount;
 * added getOpenDrawerSummaries() for the branch drawer-overview page
 */
@Injectable()
export class CashDrawerService {
  constructor(
    @InjectRepository(CashDrawer) private drawerRepo:  Repository<CashDrawer>,
    @InjectRepository(Payment)    private paymentRepo:  Repository<Payment>,
    @InjectRepository(Expense)    private expenseRepo:  Repository<Expense>,
  ) {}

  // ── Open drawer ─────────────────────────────────────────────────────────────
  // Branch-shared model: one open drawer per BRANCH + business day.
  // Permission-driven (drawer.open). userId records who opened it (audit).
  // Individual transaction accountability lives on payments.created_by_id /
  // expenses.created_by_id, independent of who the drawer itself belongs to.
  async open(
    user: RequestUser,
    openingBalance: number,
    opts?: { isOverride?: boolean; overrideReason?: string },
  ): Promise<CashDrawer> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned to your account');
    if (!user.branchId) {
      throw new ForbiddenException('Branch assignment required for financial operations.');
    }

    // One open drawer per BRANCH — prevent concurrent duplicate opens.
    const existing = await this.drawerRepo
      .createQueryBuilder('d')
      .setLock('pessimistic_write')
      .where('d.branch_id = :branchId', { branchId: user.branchId })
      .andWhere('d.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('d.status = :status', { status: 'open' })
      .getOne();
    if (existing) {
      throw new BadRequestException(
        'This branch already has an open drawer. Use the existing one instead of opening a new one.',
      );
    }

    // Also block opening a second drawer for the same business day if a closed one exists
    // (prevents "forgotten close" workarounds). Managers may override with reason.
    const today = startOfKampalaDay(new Date());
    const sameDayClosed = await this.drawerRepo
      .createQueryBuilder('d')
      .where('d.branch_id = :branchId', { branchId: user.branchId })
      .andWhere('d.tenant_id = :tenantId', { tenantId: user.tenantId })
      .andWhere('d.drawer_date = :d', { d: today.toISOString().slice(0, 10) })
      .andWhere('d.status IN (:...st)', { st: ['closed', 'reconciled'] })
      .getOne();

    const isOverride = !!opts?.isOverride;
    if (sameDayClosed && !isOverride) {
      throw new BadRequestException(
        'A drawer already exists for this business day and was closed. ' +
        'A manager/admin may perform an override open with a written reason if policy permits.',
      );
    }
    if (isOverride) {
      const reason = (opts?.overrideReason || '').trim();
      if (reason.length < 5) {
        throw new BadRequestException('overrideReason is required (min 5 characters) for override open.');
      }
    }

    const drawer = this.drawerRepo.create({
      tenantId:         user.tenantId,
      branchId:         user.branchId,
      userId:           getUserId(user),
      openingBalance,
      currentBalance:   openingBalance,
      drawerDate:       today,
      status:           'open',
      isOverrideOpen:   isOverride,
      overrideOpenReason: isOverride ? (opts?.overrideReason || null) : null,
    });
    return this.drawerRepo.save(drawer);
  }

  // ── Get current open drawer for this user's branch ──────────────────────────
  // Branch-shared: returns the branch's open drawer, regardless of who opened it.
  async getCurrent(user: RequestUser): Promise<CashDrawer> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned');
    if (!user.branchId) throw new NotFoundException('No open drawer found');
    const drawer = await this.drawerRepo.findOne({
      where: { branchId: user.branchId, tenantId: user.tenantId, status: 'open' },
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
  // Branch-shared: authorised users at the SAME branch can close.
  // closedById records who actually closed it.
  // Force-close reason is now persisted (force_close_reason + force_closed_by_id).
  async close(
    drawerId: number,
    user: RequestUser,
    actualCash: number,
    opts?: { forceClose?: boolean; forceReason?: string; discrepancyReason?: string },
  ): Promise<CashDrawer> {
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned');
    if (!user.branchId) {
      throw new ForbiddenException('Branch assignment required for financial operations.');
    }

    // Pessimistic lock to prevent concurrent double-close
    const drawer = await this.drawerRepo
      .createQueryBuilder('d')
      .setLock('pessimistic_write')
      .where('d.id = :id', { id: drawerId })
      .andWhere('d.tenant_id = :tenantId', { tenantId: user.tenantId })
      .getOne();
    if (!drawer) throw new NotFoundException('Drawer not found');

    if (drawer.status !== 'open') {
      throw new BadRequestException(`Drawer is already ${drawer.status}. Cannot close.`);
    }
    if (drawer.branchId !== user.branchId) {
      throw new ForbiddenException('You can only close a drawer at your own branch');
    }

    // ── Same-day close policy (Kampala / configured timezone) ───────────────
    const drawerDay = startOfKampalaDay(new Date(drawer.drawerDate));
    const today = startOfKampalaDay(new Date());
    const isLateClose = drawerDay.getTime() < today.getTime();

    if (isLateClose) {
      if (!opts?.forceClose) {
        throw new BadRequestException(
          'This drawer is past its business day. ' +
          'A user with drawer.force_close permission must force-close it with a reason and counted cash.',
        );
      }
      const reason = (opts.forceReason || '').trim();
      if (reason.length < 5) {
        throw new BadRequestException(
          'forceReason is required (min 5 characters) when force-closing a late drawer.',
        );
      }
      drawer.forceCloseReason = reason;
      drawer.forceClosedById = getUserId(user);
      drawer.forceClosedAt = new Date();
    }

    // Calculate expected balance from linked transactions
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
    const difference  = Number(actualCash) - expectedBal;

    // Require explanation when there is a non-zero difference
    if (Math.abs(difference) > 0.009) {
      const discReason = (opts?.discrepancyReason || opts?.forceReason || '').trim();
      if (discReason.length < 3) {
        throw new BadRequestException(
          'A non-zero cash difference requires an explanation (discrepancyReason).',
        );
      }
      drawer.notes = discReason;
    }

    drawer.closingBalance  = actualCash;
    drawer.expectedBalance = expectedBal;
    drawer.difference      = difference;
    drawer.currentBalance  = actualCash;
    drawer.status          = 'closed';
    drawer.closedAt        = new Date();
    drawer.closedById      = getUserId(user);

    return this.drawerRepo.save(drawer);
  }

  // ── Guard: reject payment/expense against non-open or stale drawer ───────────
  async assertOpen(drawerId: number, tenantId: number): Promise<CashDrawer> {
    const drawer = await this.findOne(drawerId, tenantId);
    if (drawer.status !== 'open') {
      throw new BadRequestException(
        `Cash drawer #${drawerId} is ${drawer.status}. Operations not allowed.`,
      );
    }
    // Previous-day drawers must not accept new transactions
    const drawerDay = startOfKampalaDay(new Date(drawer.drawerDate));
    const today = startOfKampalaDay(new Date());
    if (drawerDay.getTime() < today.getTime()) {
      throw new BadRequestException(
        `Cash drawer #${drawerId} belongs to a previous business day and is overdue for closing. ` +
        `Force-close it before recording new transactions. Open a new drawer for today.`,
      );
    }
    return drawer;
  }

  // ── Task 4.2/REG-03: Authoritative balance mutation API ──────────────────────
  // All balance changes must flow through deduct() or add().
  // Called by ExpensesService.approve() for cash expenses.

  async deduct(drawerId: number, amount: number, description: string, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.decrement(CashDrawer, { id: drawerId }, 'currentBalance', amount);
    } else {
      await this.drawerRepo.decrement({ id: drawerId }, 'currentBalance', amount);
    }
  }

  async add(drawerId: number, amount: number, description: string, manager?: EntityManager): Promise<void> {
    if (manager) {
      await manager.increment(CashDrawer, { id: drawerId }, 'currentBalance', amount);
    } else {
      await this.drawerRepo.increment({ id: drawerId }, 'currentBalance', amount);
    }
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

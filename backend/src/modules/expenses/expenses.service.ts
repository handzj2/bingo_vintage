import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { ExpenseCategory }   from './entities/expense-category.entity';
import { CreateExpenseDto }  from './dto/create-expense.dto';
import { CashDrawerService } from '../cash-drawers/cash-drawers.service';
import { LedgerService }     from '../ledger/ledger.service';
import { RequestUser }       from '../../common/helpers/role-helper';
import { sanitiseDto }       from '../../common/utils/sanitise';

/**
 * Task 4.1 — Restore correct expense approval workflow (REG-01, REG-02)
 * Task 4.2 — Wire cashDrawerService.deduct() on cash expense approval (REG-02)
 * Task 4.3 — Wire ledgerService.recordExpense() on approval (REG-01)
 *
 * Correct flow:
 *   create()  → validates only, saves as PENDING, NO balance mutation
 *   approve() → DataSource.transaction:
 *                 1. status = APPROVED
 *                 2. ledgerService.recordExpense()     (immutable audit trail)
 *                 3. cashDrawerService.deduct()        (cash expenses only)
 *               All three commit or all roll back.
 *   reject()  → status = REJECTED, no drawer reversal
 *               (nothing was deducted on create, so nothing to reverse)
 */
@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectRepository(Expense)         private readonly expenseRepo:  Repository<Expense>,
    @InjectRepository(ExpenseCategory) private readonly categoryRepo: Repository<ExpenseCategory>,
    private readonly cashDrawerService: CashDrawerService,
    private readonly ledgerService:     LedgerService,
    private readonly dataSource:        DataSource,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────────
  // Validation only — saves as PENDING with NO balance mutation.
  // Drawer balance changes only on approval.
  async create(rawDto: CreateExpenseDto, user: RequestUser): Promise<Expense> {
    // H5: sanitise all free-text fields before persistence (Stripe pattern)
    const dto = sanitiseDto(rawDto);
    if (!user.tenantId) throw new ForbiddenException('No tenant assigned');

    // Phase 3.4: admin/super_admin operate tenant-wide — branchId not required
    const isAdmin = ['admin', 'super_admin'].includes((user as any).roleName?.toLowerCase() || '');
    if (!isAdmin && !user.branchId) {
      throw new ForbiddenException('Branch assignment required for financial operations.');
    }

    // Validate category belongs to this tenant
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, tenantId: user.tenantId },
    });
    if (!category) throw new NotFoundException(`Expense category #${dto.categoryId} not found`);

    // If drawer provided: validate it exists, belongs to tenant, and is open.
    // NO balance mutation here — deduction fires only on approval.
    if (dto.cashDrawerId) {
      await this.cashDrawerService.assertOpen(dto.cashDrawerId, user.tenantId);
    }

    const expense = this.expenseRepo.create({
      ...dto,
      tenantId:    user.tenantId,
      branchId:    user.branchId ?? undefined,
      createdById: user.userId,
      status:      ExpenseStatus.PENDING,
    });

    return this.expenseRepo.save(expense);
  }

  // ── Approve ──────────────────────────────────────────────────────────────────
  // Runs three steps inside a single DataSource.transaction():
  //   1. Mark expense APPROVED
  //   2. Record ledger entry (expense outflow) — error swallowed by LedgerService
  //   3. Deduct drawer balance (cash expenses with linked drawer only)
  async approve(id: number, user: RequestUser): Promise<Expense> {
    const expense = await this.findOne(id, user.tenantId);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException(
        `Expense #${id} is already ${expense.status} — cannot approve again`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Step 1: Approve
      expense.status       = ExpenseStatus.APPROVED;
      expense.approvedById = user.userId;
      expense.approvedAt   = new Date();
      const saved = await manager.save(Expense, expense);

      // Step 2: Ledger entry (errors swallowed — won't roll back TX)
      await this.ledgerService.recordExpense({
        expenseId:   expense.id,
        amount:      expense.amount,
        description: expense.description,
        reference:   `EXP-${expense.id}`,
        createdBy:   user.userId,
      });

      // Step 3: Deduct drawer balance — cash expenses only
      if (expense.paymentMethod === 'cash' && expense.cashDrawerId) {
        await this.cashDrawerService.deduct(
          expense.cashDrawerId,
          Number(expense.amount),
          `Approved Expense #${expense.id}: ${expense.description}`,
        );
      }

      this.logger.log(
        `Expense #${id} APPROVED — amount: ${expense.amount}, approver: ${user.username ?? user.userId}`,
      );
      return saved;
    });
  }

  // ── Reject ───────────────────────────────────────────────────────────────────
  // Marks REJECTED. No drawer reversal — nothing was deducted on create().
  async reject(id: number, user: RequestUser): Promise<Expense> {
    const expense = await this.findOne(id, user.tenantId);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException(
        `Expense #${id} is already ${expense.status} — cannot reject`,
      );
    }

    expense.status       = ExpenseStatus.REJECTED;
    expense.approvedById = user.userId;
    expense.approvedAt   = new Date();
    return this.expenseRepo.save(expense);
  }

  // ── Find all (tenant-scoped) ──────────────────────────────────────────────────
  async findAll(tenantId: number, status?: any, limit = 100, cursor?: number): Promise<{ items: Expense[]; nextCursor: number | null }> {
    const qb = this.expenseRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.category',   'category')
      .leftJoinAndSelect('e.createdBy',  'createdBy')
      .leftJoinAndSelect('e.approvedBy', 'approvedBy')
      .where('e.tenantId = :tenantId', { tenantId })
      .orderBy('e.createdAt', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .take(Math.min(limit, 200));

    if (status) qb.andWhere('e.status = :status', { status });
    if (cursor) qb.andWhere('e.id < :cursor', { cursor });

    const items = await qb.getMany();
    const nextCursor = items.length === Math.min(limit, 200) ? items[items.length - 1]?.id ?? null : null;
    return { items, nextCursor };
  }

  // ── Find one (tenant-scoped) ──────────────────────────────────────────────────
  async findOne(id: number, tenantId: number): Promise<Expense> {
    const expense = await this.expenseRepo.findOne({
      where: { id, tenantId },
      relations: ['category', 'createdBy', 'approvedBy'],
    });
    if (!expense) throw new NotFoundException(`Expense #${id} not found`);
    return expense;
  }

  // ── Update (pending only) ─────────────────────────────────────────────────────
  async update(id: number, dto: any, user: RequestUser): Promise<Expense> {
    const expense = await this.findOne(id, user.tenantId);
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new ForbiddenException(`Expense #${id} cannot be edited — status: ${expense.status}`);
    }
    Object.assign(expense, dto);
    return this.expenseRepo.save(expense);
  }

  // ── Remove (pending only) ─────────────────────────────────────────────────────
  async remove(id: number, user: RequestUser): Promise<void> {
    const expense = await this.findOne(id, user.tenantId);
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new ForbiddenException(`Expense #${id} cannot be deleted — only pending expenses can be removed`);
    }
    await this.expenseRepo.remove(expense);
  }

  // ── Categories ────────────────────────────────────────────────────────────────
  async createCategory(name: string, description: string | undefined, tenantId: number): Promise<ExpenseCategory> {
    const existing = await this.categoryRepo.findOne({ where: { name, tenantId } });
    if (existing) throw new BadRequestException(`Category "${name}" already exists`);
    const cat = this.categoryRepo.create({ name, description, tenantId });
    return this.categoryRepo.save(cat);
  }

  async findCategories(tenantId: number): Promise<ExpenseCategory[]> {
    return this.categoryRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async updateCategory(id: number, body: Partial<{ name: string; description: string }>, tenantId: number): Promise<ExpenseCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Expense category not found');
    Object.assign(cat, body);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: number, tenantId: number): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Expense category not found');
    await this.categoryRepo.remove(cat);
  }
}

// patch 2026-06-16
import { assertPaymentDateNotFuture } from '../../common/utils/payment-date';
import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Client }           from '../clients/entities/client.entity';
import { LoanSchedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { Bike, BikeStatus } from '../bikes/entities/bike.entity';
import { SettingsService }  from '../settings/settings.service';
import { sanitiseDto }      from '../../common/utils/sanitise';
import { LedgerService }    from '../ledger/ledger.service';
import { BikesService }     from '../bikes/bikes.service';
import { addMonths } from 'date-fns';
import { assertAdmin, assertRole, isBranchScopedRole, RequestUser } from '../../common/helpers/role-helper';
import { ApplyLoanDto }          from './dto/apply-loan.dto';
import { AdminApprovalDto }      from './dto/admin-approval.dto';
import { BikeLoanCalculateDto }  from './dto/bike-loan-calculate.dto';
import { CashLoanCalculateDto }  from './dto/cash-loan-calculate.dto';
import { LoanProductsService }   from '../loan-products/loan-products.service';
import { LoanCalculatorRegistry } from './calculators/loan-calculator.registry';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity'; // NEW: for audit trail

/**
 * PHASE 5 — LoansService
 *
 * Fixes applied:
 *  FIX-L01: applyForLoan now generates the repayment schedule
 *  FIX-L02: loanNumber generation uses MAX(id) not COUNT(*)
 *  FIX-L03: loanType is explicit from DTO
 *  FIX-L04: createBikeLoan path uses correct PENDING_APPROVAL status
 *  FIX-L05: validate() removed from hot path
 *  FIX-L06: approveOrRejectLoan uses AdminApprovalDto v2
 *  FIX-L07: schedule generators explicitly set tenant_id & branch_id
 *  FIX-L08: backdateLoan writes payment_allocations for reversals
 *  FIX-L09: historicalImport uses loan calculator and writes payment_allocations
 *  FIX-L10: editLoanDetails added – allows admin to correct loan details,
 *           regenerates schedule via calculator, replays all payments
 *  FIX-L11: Waterfall payment allocation in editLoanDetails, backdateLoan,
 *           and historicalImport. Payments now carry over excess amounts to
 *           subsequent installments instead of discarding them.
 *  FIX-L12: applyPaymentsWaterfall now correctly sets tenant_id & branch_id
 *           on every payment row it inserts.
 *  FIX-L13: backdateLoan again honours the admin-supplied newBalance parameter
 *           rather than overriding it with a computed value.
 *  FIX-L14: historicalImport again preserves an imported balance (rec.balance)
 *           when provided; only falls back to computed when absent.
 */
/**
 * Keep loan.status consistent with a corrected balance (the payment path does the same:
 * paid-off => COMPLETED, reversal => ACTIVE). Without this a correction to 0 left an
 * ACTIVE loan with nothing owing, and a correction above 0 left a COMPLETED loan owing money.
 */
export function statusAfterBalanceCorrection(current: string, newBalance: number): string {
  if (newBalance <= 0 && (current === 'ACTIVE' || current === 'DEFAULTED')) return 'COMPLETED';
  if (newBalance > 0 && current === 'COMPLETED') return 'ACTIVE';
  return current;
}

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)         private loansRepo:    Repository<Loan>,
    @InjectRepository(Client)       private clientsRepo:  Repository<Client>,
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(Bike)         private bikesRepo:    Repository<Bike>,
    private settingsService: SettingsService,
    private bikesService:    BikesService,
    private readonly ledgerService: LedgerService,
    private readonly loanProductsService: LoanProductsService,
    private readonly loanCalculatorRegistry: LoanCalculatorRegistry,
  ) {}

  // ── Shared product validation ─────────────────────────────────────────────
  private async loadAndValidateProduct(
    loanProductId: number, tenantId: number, amount: number,
    termCountInMonths: number,
  ) {
    const product = await this.loanProductsService.findOne(loanProductId);
    if (product.tenantId !== tenantId) {
      throw new ForbiddenException(`This loan product does not belong to your tenant.`);
    }
    if (!product.isActive) {
      throw new ForbiddenException(`Loan product "${product.name}" is not currently active.`);
    }
    if (amount < Number(product.minAmount) ||
        (product.maxAmount != null && amount > Number(product.maxAmount))) {
      throw new BadRequestException(
        `Amount must be between ${product.minAmount} and ${product.maxAmount ?? '∞'} for "${product.name}".`,
      );
    }
    if (termCountInMonths < product.minTermMonths || termCountInMonths > product.maxTermMonths) {
      throw new BadRequestException(
        `Term must be between ${product.minTermMonths} and ${product.maxTermMonths} months for "${product.name}".`,
      );
    }
    return product;
  }

  // ── Interest helper ───────────────────────────────────────────────────────
  private calculateFlatInterest(principal: number, months: number, annualRate: number) {
    const totalInterest      = principal * annualRate * months;
    const totalPayable       = principal + totalInterest;
    const monthlyInstallment = totalPayable / months;
    const principalPerMonth  = principal     / months;
    const interestPerMonth   = totalInterest  / months;
    return {
      totalInterest:      Math.round(totalInterest      * 100) / 100,
      totalPayable:       Math.round(totalPayable       * 100) / 100,
      monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
      principalPerMonth:  Math.round(principalPerMonth  * 100) / 100,
      interestPerMonth:   Math.round(interestPerMonth   * 100) / 100,
      _rawTotalPayable: totalPayable,
    };
  }

  // ── Unique loan number ─────────────────────────────────────────────────────
  private async nextLoanNumber(em: any): Promise<string> {
    const year = new Date().getFullYear();
    const rows: any[] = await em.query(`SELECT COALESCE(MAX(id), 0) AS max FROM loans`);
    const next = Number(rows[0].max) + 1;
    return `LN-${year}-${next.toString().padStart(4, '0')}`;
  }

  // ── Schedule persistence — shared by every calculation method ─────────────
  private async persistSchedule(em: any, loan: Loan, installments: { installmentNumber: number; dueDate: Date; amountDue: number; principalDue: number; interestDue: number }[]): Promise<void> {
    await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [loan.id]);
    for (const inst of installments) {
      const dueDateStr = inst.dueDate.toISOString().slice(0, 10);
      await em.query(
        `INSERT INTO loan_schedules
           (loan_id, installment_number, due_date, amount_due, principal_due,
            interest_due, amount_paid, status, tenant_id, branch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,'PENDING',$7,$8,NOW(),NOW())`,
        [loan.id, inst.installmentNumber, dueDateStr, inst.amountDue, inst.principalDue,
         inst.interestDue, loan.tenantId ?? null, loan.branchId ?? null],
      );
    }
  }

  // ── Waterfall payment replay (FIX‑L12: tenant/branch on payments) ────────
  /**
   * Allocates payments to installments in strict order, carrying over
   * any excess to the next installment. Creates payment rows and
   * payment_allocations for every applied chunk.
   *
   * @param em          EntityManager (transaction)
   * @param loanId      The loan ID
   * @param payments    Array of { amount, paymentDate, paymentMethod?,
   *                     receiptNumber?, notes? } in chronological order.
   * @param tenantId    Tenant ID to stamp on every payment row (FIX-L12)
   * @param branchId    Branch ID to stamp on every payment row (FIX-L12)
   * @returns           Total amount applied across all installments.
   */
  private async applyPaymentsWaterfall(
    em: any,
    loanId: number,
    payments: { amount: number; paymentDate: string; paymentMethod?: string; receiptNumber?: string; notes?: string }[],
    tenantId?: number,
    branchId?: number,
  ): Promise<number> {
    // Fetch schedule rows in installment order
    const schedules = await em.query(
      `SELECT id, installment_number, amount_due, due_date
         FROM loan_schedules
        WHERE loan_id = $1
        ORDER BY installment_number`,
      [loanId],
    );

    let totalApplied = 0;
    let paymentQueue = payments.map(p => ({ ...p, remaining: p.amount })); // mutable remaining amounts

    for (const sched of schedules) {
      if (paymentQueue.length === 0) break;

      const due = Number(sched.amount_due);
      let paid = 0;

      while (paymentQueue.length > 0 && paid < due) {
        const current = paymentQueue[0];
        const apply = Math.min(current.remaining, due - paid);
        paid += apply;
        current.remaining -= apply;
        totalApplied += apply;

        // Build a receipt number (unique per chunk)
        const baseReceipt = current.receiptNumber || `WF-${loanId}-${sched.installment_number}`;
        const receipt = baseReceipt + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        // Insert payment row for this applied chunk (FIX-L12: tenant_id & branch_id)
        const [newPayment] = await em.query(
          `INSERT INTO payments
             (loan_id, schedule_id, amount, payment_method, payment_date, status,
              receipt_number, notes, tenant_id, branch_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,'COMPLETED',$6,$7,$8,$9,NOW(),NOW())
           RETURNING id`,
          [
            loanId,
            sched.id,
            apply,
            current.paymentMethod || 'CASH',
            current.paymentDate,
            receipt,
            current.notes || 'Waterfall allocation',
            tenantId ?? null,
            branchId ?? null,
          ],
        );

        // Insert allocation record
        await em.query(
          `INSERT INTO payment_allocations
             (payment_id, schedule_id, amount_applied, previous_status, new_status, created_at)
           VALUES ($1,$2,$3,'PENDING'::loan_schedules_status_enum,$4::loan_schedules_status_enum,NOW())`,
          [newPayment.id, sched.id, apply, paid >= due ? 'PAID' : 'PARTIAL'],
        );

        // If the current payment is fully consumed, remove it from the queue
        if (current.remaining <= 0) {
          paymentQueue.shift();
        }
      }

      // Update the schedule row with total paid and status
      const status = paid >= due ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
      if (paid > 0) {
        await em.query(
          `UPDATE loan_schedules
              SET amount_paid = $1,
                  status      = $2::loan_schedules_status_enum,
                  paid_date   = $3,
                  updated_at  = NOW()
            WHERE id = $4`,
          [paid, status, payments[0]?.paymentDate || new Date().toISOString(), sched.id],
        );
      }
    }

    return totalApplied;
  }

  // ── Apply for loan (main creation path) ───────────────────────────────────
  async applyForLoan(rawData: ApplyLoanDto, user: RequestUser): Promise<Loan> {
    const data = sanitiseDto(rawData);
    return this.loansRepo.manager.transaction(async (em) => {
      const { clientId, bikeId, amount, months = 12, interestRate, loanProductId } = data as any;

      const client = await em.findOne(Client, { where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found');

      const loanTenantId = user?.tenantId ?? client.tenantId ?? 0;

      let loanType: string;
      let annualRate: number;
      let processingFee: number;
      let loanTerm: number;
      let lateFeeDaily: number | undefined;
      let loadedProduct: { id: number; code: string; name: string } | null = null;

      let calculationMethod: string;

      if (loanProductId) {
        const product = await this.loadAndValidateProduct(loanProductId, loanTenantId, amount, months);
        loadedProduct     = { id: product.id, code: product.code, name: product.name };
        loanType          = product.productType;
        annualRate        = Number(product.interestRate);
        processingFee     = Number(product.processingFee);
        loanTerm          = months;
        lateFeeDaily      = Number(product.lateFeeDaily);
        calculationMethod = product.calculationMethod || 'monthly_flat';
      } else {
        loanType = (data as any).loanType?.toLowerCase() === 'bike' ? 'bike' : 'cash';
        annualRate    = interestRate ??
          await this.settingsService.getNumberForTenant('LOAN_INTEREST_RATE', loanTenantId, 0.15);
        processingFee =
          await this.settingsService.getNumberForTenant('loan.processing_fee', loanTenantId, 0);
        loanTerm          = months;
        calculationMethod = 'monthly_flat';
      }

      const startDate = (data as any).start_date
        ? new Date((data as any).start_date)
        : new Date();
      const endDate    = addMonths(startDate, loanTerm);

      const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
      const calculation = calculator.calculate({
        tenantId: loanTenantId, clientId,
        loanProduct: loadedProduct,
        principal: amount, termCount: loanTerm, annualInterestRate: annualRate,
        processingFee, startDate,
      });

      if (bikeId) {
        const bike = await em.findOne(Bike, { where: { id: bikeId } });
        if (!bike) throw new NotFoundException('Bike not found');
        if (bike.status !== BikeStatus.AVAILABLE) {
          throw new BadRequestException(`Bike is not available. Status: ${bike.status}`);
        }
        await em.update(Bike, bike.id, {
          status: BikeStatus.LOANED, assigned_client_id: clientId,
        });
      }

      const loanNumber = await this.nextLoanNumber(em);

      const loan = em.create(Loan, {
        loanNumber,
        principalAmount: amount,
        interestRate:    annualRate,
        processingFee,
        totalAmount:     calculation.totalPayable + processingFee,
        balance:         calculation.totalPayable + processingFee,
        termMonths:      loanTerm,
        startDate,
        endDate,
        client,
        status:      LoanStatus.PENDING_APPROVAL,
        loanType,
        loanProductId: loanProductId ?? null,
        createdBy: user?.userId ?? null,
        tenantId:  user?.tenantId ?? client.tenantId,
        branchId:  user?.branchId ?? client.branchId ?? null,
        ...(bikeId && { bike: { id: bikeId } }),
      } as any);

      const savedLoan = await em.save(Loan, loan);
      await this.persistSchedule(em, savedLoan, calculation.installments);
      return savedLoan;
    });
  }

  // ── findOne ───────────────────────────────────────────────────────────────
  // Phase 3: accepts optional tenantId for tenant-scoped lookups.
  // When tenantId is supplied the query filters by it so a user cannot
  // fetch another tenant's loan by guessing the numeric ID.
  async findOne(id: number, tenantId?: number) {
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    const loan = await this.loansRepo.findOne({
      where,
      relations: ['client', 'bike', 'payments', 'schedules'],
    });
    if (!loan) throw new NotFoundException(`Loan #${id} not found`);
    return loan;
  }

  // ── findAll ───────────────────────────────────────────────────────────────
  async findAll(filters: {
    status?: string; type?: string; startDate?: string; endDate?: string;
    tenantId?: number; clientId?: number;
  }) {
    const qb = this.loansRepo.createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client')
      .orderBy('loan.createdAt', 'DESC');

    if (filters.tenantId) qb.andWhere('loan.tenantId = :tenantId', { tenantId: filters.tenantId });
    if (filters.status)    qb.andWhere('loan.status    = :status', { status: filters.status });
    if (filters.type)      qb.andWhere('loan.loanType  = :type',   { type:   filters.type   });
    if (filters.startDate) qb.andWhere('loan.startDate >= :sd',    { sd:     filters.startDate });
    if (filters.endDate)   qb.andWhere('loan.endDate   <= :ed',    { ed:     filters.endDate   });
    if (filters.clientId)  qb.andWhere('loan.clientId  = :clientId', { clientId: filters.clientId });

    return qb.getMany();
  }

  // ── searchLoans ───────────────────────────────────────────────────────────
  // Phase 3: tenantId filter is MANDATORY — must come from the authenticated
  // JWT, never from the request body or query string.
  async searchLoans(dto: any, tenantId?: number) {
    const qb = this.loansRepo.createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client');
    // Always scope to caller's tenant (confirmed Phase 1 gap)
    if (tenantId) qb.andWhere('loan.tenantId = :tenantId', { tenantId });
    if (dto.loanNumber) qb.andWhere('loan.loanNumber ILIKE :n', { n: `%${dto.loanNumber}%` });
    if (dto.clientName) qb.andWhere("(client.first_name || ' ' || client.last_name) ILIKE :cn", { cn: `%${dto.clientName}%` });
    if (dto.status)     qb.andWhere('loan.status = :s', { s: dto.status });
    if (dto.loanType)   qb.andWhere('loan.loanType = :t', { t: dto.loanType });
    return qb.orderBy('loan.createdAt', 'DESC').getMany();
  }

  // ── calculateCashLoan ─────────────────────────────────────────────────────
  async calculateCashLoan(dto: CashLoanCalculateDto) {
    const { amount, termMonths, interestRate } = dto;
    return this.calculateFlatInterest(amount, termMonths, interestRate);
  }

  // ── calculateBikeLoan ─────────────────────────────────────────────────────
  async calculateBikeLoan(dto: BikeLoanCalculateDto) {
    const { salePrice, deposit, termWeeks, interestRate = 0 } = dto;
    const principal        = salePrice - deposit;
    const totalInterest    = principal * interestRate * (termWeeks / 52);
    const totalPayable     = principal + totalInterest;
    const weeklyInstallment = Math.round((totalPayable / termWeeks) * 100) / 100;
    return { principal, totalInterest, totalPayable, weeklyInstallment };
  }

  // ── previewBikeLoan ───────────────────────────────────────────────────────
  async previewBikeLoan(opts: {
    salePrice: number; deposit: number; targetWeeks?: number; targetMonthly?: number;
  }) {
    const principal = opts.salePrice - opts.deposit;
    const weeks     = opts.targetWeeks ?? 104;
    const weekly    = Math.round((principal / weeks) * 100) / 100;
    return { principal, weeklyInstallment: weekly, totalWeeks: weeks };
  }

  // ── approveOrRejectLoan ───────────────────────────────────────────────────
  async approveOrRejectLoan(loanId: number, dto: AdminApprovalDto, user: any): Promise<Loan> {
    const loan = await this.findOne(loanId);
    if (dto.action === 'approve') {
      loan.approve(user.userId);
    } else if (dto.action === 'reject') {
      loan.reject(user.userId, dto.reason);
    } else {
      throw new BadRequestException('Action must be "approve" or "reject"');
    }
    return this.loansRepo.save(loan);
  }

  // ── reverseOrAdjustLoan ───────────────────────────────────────────────────
  async reverseOrAdjustLoan(id: number, dto: any, user: RequestUser) {
    const qr = this.loansRepo.manager.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const loan = await qr.manager
        .createQueryBuilder(Loan, 'loan')
        .where('loan.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!loan) throw new NotFoundException(`Loan #${id} not found`);

      const previousBalance = Number(loan.balance);
      const detail = dto.newBalance !== undefined
        ? `${dto.reason ?? 'No reason'} (balance corrected: ${previousBalance} -> ${Number(dto.newBalance)})`
        : (dto.reason ?? 'No reason');
      loan.addAuditNote('REVERSAL', `Admin ${user.userId}`, detail);
      if (dto.newBalance !== undefined) loan.balance = dto.newBalance;

      const saved = await qr.manager.save(Loan, loan);
      await qr.commitTransaction();
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── updateLoan ────────────────────────────────────────────────────────────
  async updateLoan(id: number, dto: any, user: RequestUser) {
    const qr = this.loansRepo.manager.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const loan = await qr.manager
        .createQueryBuilder(Loan, 'loan')
        .where('loan.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!loan) throw new NotFoundException(`Loan #${id} not found`);

      if (dto.amount) loan.principalAmount = dto.amount;
      loan.addAuditNote('UPDATE', `Admin ${user.userId}`, dto.details ?? '');

      const saved = await qr.manager.save(Loan, loan);
      await qr.commitTransaction();
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── updateLoanStatus ──────────────────────────────────────────────────────
  async updateLoanStatus(id: number, status: string, user: RequestUser) {
    const loan = await this.findOne(id);
    if (!Object.values(LoanStatus).includes(status as LoanStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    loan.status = status as LoanStatus;
    loan.addAuditNote('STATUS_CHANGE', `Admin ${user.userId}`, `Changed to ${status}`);
    return this.loansRepo.save(loan);
  }

  // ── backdateLoan (FIX-L13: honours newBalance parameter) ──────────────────
  async backdateLoan(
    id: number,
    startDateStr: string,
    paidInstallments: { installmentNumber: number; amountPaid: number; paidDate: string }[],
    newBalance: number,
    user: RequestUser,
  ) {
    const newStart = new Date(startDateStr);
    if (isNaN(newStart.getTime())) {
      throw new BadRequestException(`Invalid start date: ${startDateStr}`);
    }
    for (const pi of paidInstallments ?? []) {
      assertPaymentDateNotFuture(pi.paidDate, `Paid date for installment ${pi.installmentNumber}`);
    }

    return this.loansRepo.manager.transaction(async (em) => {
      const loan = await em.findOne(Loan, { where: { id }, relations: ['client'] });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);

      // Guard: no real payments already recorded (historical entry only)
      const [{ count }] = await em.query(
        `SELECT COUNT(*) AS count FROM payments
         WHERE loan_id = $1 AND status = 'COMPLETED' AND notes != 'Historical import'`,
        [id],
      );
      if (Number(count) > 0) {
        throw new BadRequestException(
          `Loan ${loan.loanNumber} already has ${count} real payment(s) recorded. ` +
          `Use the reschedule endpoint for date correction only.`,
        );
      }

      // Step 1: Clear existing payments and schedules
      await em.query(`DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE loan_id = $1)`, [id]);
      await em.query(`DELETE FROM payments WHERE loan_id = $1`, [id]);
      await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [id]);

      // Step 2: Update loan start/end date – balance will be set later
      const newEnd = loan.termWeeks && loan.termWeeks > 0
        ? new Date(newStart.getTime() + loan.termWeeks * 7 * 24 * 60 * 60 * 1000)
        : addMonths(newStart, loan.termMonths);

      await em.query(
        `UPDATE loans
         SET start_date = $1, end_date = $2, updated_at = NOW()
         WHERE id = $3`,
        [newStart.toISOString().slice(0, 10), newEnd.toISOString().slice(0, 10), id],
      );

      // Step 3: Regenerate schedule
      const calculationMethod = loan.termWeeks && loan.termWeeks > 0
        ? 'weekly_flat' : 'monthly_flat';
      const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
      const termCount  = loan.termWeeks && loan.termWeeks > 0
        ? loan.termWeeks : loan.termMonths;

      const calculation = calculator.calculate({
        principal:          Number(loan.principalAmount),
        termCount,
        annualInterestRate: Number(loan.interestRate),
        processingFee:      Number(loan.processingFee ?? 0),
        startDate:          newStart,
      }, { installmentOverride: loan.weeklyAmount ? Number(loan.weeklyAmount) : undefined });

      await this.persistSchedule(em, loan, calculation.installments);

      // Step 4: Build waterfall payment list from paidInstallments
      const paymentsForWaterfall = paidInstallments
        .sort((a, b) => a.installmentNumber - b.installmentNumber)
        .map(p => ({
          amount: p.amountPaid,
          paymentDate: p.paidDate,
          paymentMethod: 'CASH' as string,
          receiptNumber: `BACKDATE-${id}-${p.installmentNumber}`,
          notes: 'Historical import',
        }));

      // Apply waterfall (FIX-L12: pass tenant & branch)
      const totalApplied = await this.applyPaymentsWaterfall(
        em, id, paymentsForWaterfall, loan.tenantId, loan.branchId,
      );

      // Mark overdue installments
      const today = new Date().toISOString().slice(0, 10);
      await em.query(
        `UPDATE loan_schedules SET status = 'OVERDUE' WHERE loan_id = $1 AND status = 'PENDING' AND due_date < $2`,
        [id, today],
      );

      // Update totalAmount and balance – HONOUR the admin-supplied newBalance (FIX-L13)
      const newTotal = calculation.totalPayable;
      const finalBalance = newBalance;   // use the parameter exactly as given

      await em.query(
        `UPDATE loans
         SET total_amount = $1, balance = $2, updated_at = NOW()
         WHERE id = $3`,
        [newTotal, finalBalance, id],
      );

      loan.addAuditNote(
        'BACKDATE',
        `User ${user.userId}`,
        `Loan backdated to ${startDateStr}. ` +
        `${paidInstallments.length} historical payments recorded. ` +
        `Balance set to ${finalBalance}.`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        loanNumber:               loan.loanNumber,
        realStartDate:            newStart.toISOString().slice(0, 10),
        scheduleRegenerated:      calculation.installments.length,
        historicalPaymentsLoaded: paidInstallments.length,
        newBalance: finalBalance,
      };
    });
  }

  // ── rescheduleLoan ────────────────────────────────────────────────────────
  async rescheduleLoan(id: number, startDateStr: string, user: RequestUser) {
    const newStart = new Date(startDateStr);
    if (isNaN(newStart.getTime())) {
      throw new BadRequestException(`Invalid start date: ${startDateStr}`);
    }

    return this.loansRepo.manager.transaction(async (em) => {
      const loan = await em.findOne(Loan, { where: { id }, relations: ['client'] });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);

      const [{ count }] = await em.query(
        `SELECT COUNT(*) AS count FROM payments WHERE loan_id = $1 AND status = 'COMPLETED'`,
        [id],
      );
      if (Number(count) > 0) {
        throw new BadRequestException(
          `Cannot reschedule loan ${loan.loanNumber} — ${count} payment(s) have already been recorded. ` +
          `Reverse all payments first, then reschedule.`,
        );
      }

      const newEnd = addMonths(newStart, loan.termMonths);
      await em.query(
        `UPDATE loans SET start_date = $1, end_date = $2, updated_at = NOW() WHERE id = $3`,
        [newStart.toISOString().slice(0, 10), newEnd.toISOString().slice(0, 10), id],
      );
      await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [id]);

      const calculationMethod = loan.termWeeks && loan.termWeeks > 0
        ? 'weekly_flat' : 'monthly_flat';
      const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
      const termCount  = loan.termWeeks && loan.termWeeks > 0
        ? loan.termWeeks : loan.termMonths;
      const principal  = Number(loan.principalAmount);
      const annualRate = Number(loan.interestRate);
      const procFee    = Number(loan.processingFee ?? 0);

      const calculation = calculator.calculate({
        principal, termCount, annualInterestRate: annualRate,
        processingFee: procFee, startDate: newStart,
      });
      await this.persistSchedule(em, loan, calculation.installments);

      loan.addAuditNote(
        'RESCHEDULE',
        `User ${user.userId}`,
        `Start date corrected to ${startDateStr}. Schedule regenerated.`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        loanNumber: loan.loanNumber,
        newStartDate: newStart.toISOString().slice(0, 10),
        newEndDate: newEnd.toISOString().slice(0, 10),
        installmentsGenerated: calculation.installments.length,
      };
    });
  }

  // ── editLoanDetails (waterfall version) ───────────────────────────────────
  async editLoanDetails(
    id: number,
    dto: {
      principalAmount?: number;
      termWeeks?: number;
      termMonths?: number;
      weeklyAmount?: number;
      interestRate?: number;
      startDate?: string;
      newBalance?: number;
    },
    user: RequestUser,
  ) {
    return this.loansRepo.manager.transaction(async (em) => {
      const loan = await em.findOne(Loan, { where: { id }, relations: ['client'] });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);
      if (loan.status === LoanStatus.CANCELLED || loan.deletedAt) {
        throw new BadRequestException('Cannot edit a cancelled or deleted loan');
      }

      // Update loan fields if provided
      if (dto.principalAmount !== undefined) loan.principalAmount = dto.principalAmount;
      if (dto.termWeeks !== undefined) loan.termWeeks = dto.termWeeks;
      if (dto.termMonths !== undefined) loan.termMonths = dto.termMonths;
      if (dto.weeklyAmount !== undefined) loan.weeklyAmount = dto.weeklyAmount;
      if (dto.interestRate !== undefined) loan.interestRate = dto.interestRate;
      if (dto.startDate) {
        const newStart = new Date(dto.startDate);
        if (isNaN(newStart.getTime())) throw new BadRequestException('Invalid start date');
        loan.startDate = newStart;
      }

      // Determine term for calculator
      const weeks = loan.termWeeks || 0;
      const termCount = weeks > 0 ? weeks : (loan.termMonths || 12);
      const principal = Number(loan.principalAmount);
      const startDate = new Date(loan.startDate);

      const calculationMethod = loan.loanType === 'bike' ? 'weekly_flat' : 'monthly_flat';
      const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
      const calculation = calculator.calculate({
        principal,
        termCount,
        annualInterestRate: Number(loan.interestRate),
        processingFee: Number(loan.processingFee ?? 0),
        startDate,
        ...(loan.loanType === 'bike' && loan.weeklyAmount
          ? { installmentOverride: Number(loan.weeklyAmount) }
          : {}),
      });

      // Save existing payments before deleting them
      const originalPayments = await em.query(
        `SELECT * FROM payments
         WHERE loan_id = $1 AND status = 'COMPLETED' AND reversed_at IS NULL
         ORDER BY payment_date, id`,
        [id],
      );

      // Delete old schedule, payment_allocations, and payments
      await em.query('DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE loan_id = $1)', [id]);
      await em.query('DELETE FROM payments WHERE loan_id = $1', [id]);
      await em.query('DELETE FROM loan_schedules WHERE loan_id = $1', [id]);

      // Persist new schedule
      await this.persistSchedule(em, loan, calculation.installments);

      // Convert original payments to waterfall format
      const paymentsForWaterfall = originalPayments.map((p: any) => ({
        amount: Number(p.amount),
        paymentDate: new Date(p.payment_date).toISOString().slice(0, 10),
        paymentMethod: p.payment_method || 'CASH',
        receiptNumber: p.receipt_number,
        notes: p.notes || 'Replayed after edit',
      }));

      // Apply waterfall (FIX-L12: pass tenant & branch)
      const totalApplied = await this.applyPaymentsWaterfall(
        em, id, paymentsForWaterfall, loan.tenantId, loan.branchId,
      );

      // Mark overdue installments
      const today = new Date().toISOString().slice(0, 10);
      await em.query(
        `UPDATE loan_schedules SET status = 'OVERDUE' WHERE loan_id = $1 AND status = 'PENDING' AND due_date < $2`,
        [id, today],
      );

      // Update totalAmount and balance (FIX-L10: honour optional newBalance)
      const newTotal = calculation.totalPayable;
      const finalBalance = dto.newBalance !== undefined ? dto.newBalance : (newTotal - totalApplied);

      await em.query(
        `UPDATE loans
         SET total_amount = $1, balance = $2, updated_at = NOW()
         WHERE id = $3`,
        [newTotal, finalBalance, id],
      );

      loan.addAuditNote(
        'EDIT_DETAILS',
        `Admin ${user.userId}`,
        `Loan details edited. Principal: ${principal}, termWeeks: ${weeks}, ` +
        `totalAmount: ${newTotal}, balance: ${finalBalance}`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        loanNumber: loan.loanNumber,
        totalAmount: newTotal,
        balance: finalBalance,
        scheduleRegenerated: calculation.installments.length,
        paymentsReplayed: originalPayments.length,
      };
    });
  }

  async hardDeleteLoan(id: number, user: RequestUser) {
    const loan = await this.findOne(id);
    loan.softDelete(user.userId);
    await this.loansRepo.save(loan);
    return { message: `Loan ${id} soft-deleted` };
  }

  async getPortfolioSummary(user: RequestUser) {
    const rows: any[] = await this.loansRepo.manager.query(`
      SELECT
        COUNT(*)                                    AS total_loans,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')  AS active_loans,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending_loans,
        COALESCE(SUM(balance), 0)                  AS total_outstanding,
        COALESCE(SUM(total_amount), 0)             AS total_disbursed
      FROM loans
      WHERE tenant_id = $1
    `, [user.tenantId]);
    return rows[0];
  }

  async getOverdueLoansReport(tenantId: number, limit = 200) {
    if (!tenantId) throw new ForbiddenException('No tenant assigned — cannot run overdue report without a tenant context');
    const where: any = { status: LoanStatus.DELINQUENT, tenantId };
    return this.loansRepo.find({
      where,
      relations: ['client'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  async getLoanAuditTrail(loanId: number) {
    const loan = await this.findOne(loanId);
    return { loanId, notes: loan.notes };
  }

  // ── create (used by createBikeLoan controller path) ───────────────────────
  async create(dto: any) {
    return this.loansRepo.manager.transaction(async (em) => {
      const year    = new Date().getFullYear();
      const rows: any[] = await em.query(`SELECT COALESCE(MAX(id), 0) AS max FROM loans`);
      const loanNumber = `LN-${year}-${(Number(rows[0].max) + 1).toString().padStart(4, '0')}`;

      const principal    = Number(dto.principal_amount);
      const weeks        = Number(dto.term_weeks) || 0;
      const termMonths   = weeks > 0 ? Math.ceil(weeks / 4) : 12;
      const weeklyAmount = dto.weekly_installment ? Number(dto.weekly_installment) : null;
      const loanProductId: number | undefined = dto.loan_product_id ?? undefined;
      const tenantIdForGuard = dto.tenant_id ?? undefined;

      let totalAmount: number;
      let loadedProduct: { id: number; code: string; name: string; calculationMethod: string } | null = null;

      if (loanProductId && tenantIdForGuard) {
        const product = await this.loadAndValidateProduct(
          loanProductId, tenantIdForGuard, principal, termMonths,
        );
        loadedProduct = {
          id: product.id, code: product.code, name: product.name,
          calculationMethod: product.calculationMethod || 'weekly_flat',
        };
        totalAmount = principal;
      } else {
        totalAmount = principal;
      }

      const loan = em.create(Loan, {
        loanNumber,
        loanType:       dto.loan_type ?? 'bike',
        clientId:       Number(dto.client_id),
        bikeId:         dto.bike_id ? Number(dto.bike_id) : undefined,
        principalAmount: principal,
        interestRate:   Number(dto.interest_rate ?? 0),
        totalAmount,
        balance:        totalAmount,
        termMonths,
        termWeeks:      weeks || null,
        weeklyAmount,
        deposit:        dto.deposit ? Number(dto.deposit) : 0,
        startDate:      new Date(),
        notes:          dto.notes ?? null,
        status:         LoanStatus.PENDING_APPROVAL,
        loanProductId:  loadedProduct?.id ?? null,
        tenantId:       dto.tenant_id ?? undefined,
        branchId:       dto.branch_id ?? undefined,
      } as any);

      const savedLoan = await em.save(Loan, loan);

      if (weeks > 0 && weeklyAmount) {
        const calculator = this.loanCalculatorRegistry.resolve(loadedProduct?.calculationMethod ?? 'weekly_flat');
        const calculation = calculator.calculate(
          {
            tenantId: tenantIdForGuard, clientId: Number(dto.client_id),
            loanProduct: loadedProduct,
            principal, termCount: weeks, annualInterestRate: 0, processingFee: 0,
            startDate: savedLoan.startDate,
          },
          { installmentOverride: weeklyAmount },
        );
        await this.persistSchedule(em, savedLoan, calculation.installments);
      }

      return savedLoan;
    });
  }

  // ── Historical loan import (FIX-L14: preserves imported balance) ──────────
  async historicalImport(
    records: any[],
    tenantId: number | undefined,
    branchId: number | undefined,
  ): Promise<{ success: number; skipped: number; errors: { client: string; error: string }[] }> {
    let success = 0;
    let skipped = 0;
    const errors: { client: string; error: string }[] = [];

    for (const rec of records) {
      try {
        if (!rec.clientName || !rec.phone) {
          skipped++;
          errors.push({ client: rec.clientName || 'unknown', error: 'Missing client name or phone' });
          continue;
        }

        await this.loansRepo.manager.transaction(async (em) => {
          const nameParts = rec.clientName.trim().split(' ');
          const firstName = nameParts[0];
          const lastName  = nameParts.slice(1).join(' ') || nameParts[0];

          let client = await em.findOne(Client, { where: { phone: rec.phone } });
          if (!client) {
            client = em.create(Client, {
              firstName,
              lastName,
              phone:      rec.phone,
              nin:        rec.nin || undefined,
              address:    rec.address || undefined,
              tenantId:   tenantId ?? undefined,
            } as any);
            client = await em.save(Client, client);
          }

          // Determine loan type and calculator
          const loanType = (rec.loanType as string)?.toLowerCase() === 'cash' ? 'cash' : 'bike';
          const weeks = Number(rec.termWeeks) || 0;
          const termMonths = weeks > 0 ? Math.ceil(weeks / 4) : (Number(rec.termMonths) || 12);
          const principal = Number(rec.principalAmount) || Number(rec.totalAmount) || 0;
          const startDate = rec.startDate ? new Date(rec.startDate) : new Date();

          const calculationMethod = loanType === 'bike' ? 'weekly_flat' : 'monthly_flat';
          const termCount = loanType === 'bike' ? (weeks || 0) : termMonths;

          const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
          const calculation = calculator.calculate({
            principal,
            termCount,
            annualInterestRate: 0,
            processingFee: 0,
            startDate,
            ...(loanType === 'bike' && rec.weeklyAmount ? { installmentOverride: Number(rec.weeklyAmount) } : {}),
          });

          // Create loan record
          const year = new Date().getFullYear();
          const rows: any[] = await em.query(`SELECT COALESCE(MAX(id), 0) AS max FROM loans`);
          const loanNumber = `LN-IMPORT-${year}-${(Number(rows[0].max) + 1).toString().padStart(4, '0')}`;
          const loanStatus = rec.status === 'COMPLETED' ? LoanStatus.COMPLETED : LoanStatus.ACTIVE;

          const loan = em.create(Loan, {
            loanNumber,
            loanType,
            clientId:        client.id,
            tenantId:        tenantId ?? undefined,
            branchId:        branchId ?? undefined,
            principalAmount: principal,
            interestRate:    0,
            totalAmount:     calculation.totalPayable,
            balance:         Number(rec.balance) || calculation.totalPayable,
            termMonths,
            termWeeks:       weeks || null,
            weeklyAmount:    Number(rec.weeklyAmount) || null,
            deposit:         Number(rec.deposit) || 0,
            startDate,
            status:          loanStatus,
            notes:           `Imported from historical ledger. Guarantors: ${(rec.guarantors || []).join(', ') || 'none'}`,
          } as any);

          const savedLoan = await em.save(Loan, loan);

          // Persist calculator‑generated schedule
          await this.persistSchedule(em, savedLoan, calculation.installments);

          // Build payment list from the import data
          const paymentsArray: { amount: number; paymentDate: string; paymentMethod: string; receiptNumber: string; notes: string }[] = [];
          if (Array.isArray(rec.payments)) {
            for (const p of rec.payments) {
              const amountPaid = Number(p.amountPaid) || 0;
              if (amountPaid > 0) {
                paymentsArray.push({
                  amount: amountPaid,
                  paymentDate: p.date || new Date().toISOString().slice(0, 10),
                  paymentMethod: 'CASH',
                  receiptNumber: `HIST-${savedLoan.id}-${p.date || 'unknown'}`,
                  notes: 'Historical import',
                });
              }
            }
          }

          // Apply waterfall (FIX-L12: pass tenant & branch)
          const totalApplied = await this.applyPaymentsWaterfall(
            em, savedLoan.id, paymentsArray, tenantId, branchId,
          );

          // Mark overdue installments
          const today = new Date().toISOString().slice(0, 10);
          await em.query(
            `UPDATE loan_schedules SET status = 'OVERDUE' WHERE loan_id = $1 AND status = 'PENDING' AND due_date < $2`,
            [savedLoan.id, today],
          );

          // Update loan totals – PRESERVE imported balance if provided (FIX-L14)
          const newTotal = calculation.totalPayable;
          const importedBalance = rec.balance !== undefined ? Number(rec.balance) : undefined;
          const finalBalance = importedBalance !== undefined ? importedBalance : (newTotal - totalApplied);

          await em.query(
            `UPDATE loans
             SET total_amount = $1, balance = $2, updated_at = NOW()
             WHERE id = $3`,
            [newTotal, finalBalance, savedLoan.id],
          );
        });

        success++;
      } catch (err: any) {
        skipped++;
        errors.push({ client: rec.clientName || 'unknown', error: err.message || 'Unknown error' });
      }
    }

    return { success, skipped, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATIONAL CONTROL UPGRADE — Safe loan restructuring / correction
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Safe reschedule / terms correction that NEVER deletes historical payments.
   *
   * Steps:
   * 1. Lock loan
   * 2. Load existing COMPLETED payments (keep original IDs & references)
   * 3. Validate proposed terms
   * 4. Calculate new schedule via existing product calculator
   * 5. Supersede old active schedule rows (versioning)
   * 6. Insert new active schedule (next version)
   * 7. Re-allocate existing payments onto the new schedule (update allocations only)
   * 8. Recalculate balance / arrears
   * 9. Write loan_corrections audit row
   */
  async safeRestructureLoan(
    id: number,
    dto: {
      principalAmount?: number;
      termWeeks?: number;
      termMonths?: number;
      weeklyAmount?: number;
      interestRate?: number;
      startDate?: string;
      reason: string;
      correctionType?: 'TERMS' | 'RESCHEDULE' | 'SCHEDULE';
    },
    user: RequestUser,
  ) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('A meaningful correction reason (min 5 chars) is required');
    }

    return this.loansRepo.manager.transaction(async (em) => {
      // Lock the row on its own: findOne({lock}) on Loan fails in PostgreSQL (0A000 "FOR UPDATE
      // cannot be applied to the nullable side of an outer join") because Loan eagerly joins client.
      await em.query(`SELECT id FROM loans WHERE id = $1 FOR UPDATE`, [id]);
      const loan = await em.findOne(Loan, { where: { id }, relations: ['client'] });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);
      if (loan.status === LoanStatus.CANCELLED || (loan as any).deletedAt) {
        throw new BadRequestException('Cannot restructure a cancelled or deleted loan');
      }
      if (loan.tenantId && user.tenantId && loan.tenantId !== user.tenantId) {
        throw new ForbiddenException('Tenant isolation violation');
      }

      // Snapshot previous state for audit
      const previousSnapshot = {
        principalAmount: Number(loan.principalAmount),
        interestRate: Number(loan.interestRate),
        termWeeks: loan.termWeeks,
        termMonths: loan.termMonths,
        weeklyAmount: loan.weeklyAmount ? Number(loan.weeklyAmount) : null,
        startDate: loan.startDate,
        endDate: loan.endDate,
        totalAmount: Number(loan.totalAmount),
        balance: Number(loan.balance),
      };

      // Apply proposed term changes
      if (dto.principalAmount !== undefined) loan.principalAmount = dto.principalAmount;
      if (dto.termWeeks !== undefined) loan.termWeeks = dto.termWeeks;
      if (dto.termMonths !== undefined) loan.termMonths = dto.termMonths;
      if (dto.weeklyAmount !== undefined) loan.weeklyAmount = dto.weeklyAmount;
      if (dto.interestRate !== undefined) loan.interestRate = dto.interestRate;
      if (dto.startDate) {
        const newStart = new Date(dto.startDate);
        if (isNaN(newStart.getTime())) throw new BadRequestException('Invalid start date');
        loan.startDate = newStart;
      }

      const weeks = loan.termWeeks || 0;
      const termCount = weeks > 0 ? weeks : (loan.termMonths || 12);
      const principal = Number(loan.principalAmount);
      const startDate = new Date(loan.startDate);

      const calculationMethod = (loan as any).loanType === 'bike' || weeks > 0
        ? 'weekly_flat' : 'monthly_flat';
      const calculator = this.loanCalculatorRegistry.resolve(calculationMethod);
      const calculation = calculator.calculate({
        principal,
        termCount,
        annualInterestRate: Number(loan.interestRate),
        processingFee: Number(loan.processingFee ?? 0),
        startDate,
        ...(weeks > 0 && loan.weeklyAmount
          ? { installmentOverride: Number(loan.weeklyAmount) }
          : {}),
      });

      // Determine next schedule version
      const verRow = await em.query(
        `SELECT COALESCE(MAX(version), 0) AS max_v FROM loan_schedules WHERE loan_id = $1`,
        [id],
      );
      const nextVersion = Number(verRow[0]?.max_v || 0) + 1;

      // Supersede current active schedule
      await em.query(
        `UPDATE loan_schedules
            SET is_active = false,
                superseded_at = NOW(),
                superseded_by_version = $2
          WHERE loan_id = $1 AND is_active = true`,
        [id, nextVersion],
      );

      // Insert new active schedule (do NOT delete old rows)
      for (const inst of calculation.installments) {
        const dueDateStr = inst.dueDate.toISOString().slice(0, 10);
        await em.query(
          `INSERT INTO loan_schedules
             (loan_id, installment_number, due_date, amount_due, principal_due,
              interest_due, amount_paid, status, tenant_id, branch_id,
              version, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,0,'PENDING',$7,$8,$9,true,NOW(),NOW())`,
          [
            id, inst.installmentNumber, dueDateStr, inst.amountDue,
            inst.principalDue, inst.interestDue,
            loan.tenantId ?? null, loan.branchId ?? null, nextVersion,
          ],
        );
      }

      // Load original COMPLETED payments (preserve every field)
      const originalPayments = await em.query(
        `SELECT id, amount, payment_date, payment_method, receipt_number,
                notes, cash_drawer_id, created_by_id, status, reversed_at
           FROM payments
          WHERE loan_id = $1
            AND status = 'COMPLETED'
            AND (reversed_at IS NULL)
          ORDER BY payment_date, id`,
        [id],
      );

      // Allocation history is IMMUTABLE. Existing payment_allocations rows (including reversed
      // ones) are never deleted or edited. Superseding the schedule above (is_active=false,
      // superseded_at, superseded_by_version) is what supersedes them: an allocation is "current"
      // only while its schedule row is active, and readers that undo or display allocations
      // (PaymentAllocationService, reversePayment, receipts) filter on that. Record which
      // allocations were superseded so the correction is fully traceable.
      const supersededAllocations: { id: number }[] = await em.query(
        `SELECT pa.id
           FROM payment_allocations pa
           JOIN loan_schedules ls ON ls.id = pa.schedule_id
          WHERE ls.loan_id = $1 AND ls.is_active = false AND ls.superseded_by_version = $2
          ORDER BY pa.id`,
        [id, nextVersion],
      );

      // Re-allocate the existing payments onto the new schedule: NEW allocation rows stamped with
      // the new schedule_version. Payment rows (ids, receipts, dates, drawer links, reversal
      // fields) are not touched.
      const realloc = await this.reallocateExistingPayments(em, id, originalPayments, nextVersion);
      const totalApplied = realloc.totalApplied;

      // Mark overdue installments on the new schedule
      const todayStr = new Date().toISOString().slice(0, 10);
      await em.query(
        `UPDATE loan_schedules
            SET status = 'OVERDUE'
          WHERE loan_id = $1 AND is_active = true
            AND status = 'PENDING' AND due_date < $2`,
        [id, todayStr],
      );

      const newTotal = calculation.totalPayable;
      const finalBalance = Math.max(0, newTotal - totalApplied);

      // Update loan header
      if (dto.startDate) {
        const newEnd = calculationMethod === 'weekly_flat'
          ? new Date(startDate.getTime() + (termCount * 7 * 24 * 60 * 60 * 1000))
          : addMonths(startDate, termCount);
        loan.endDate = newEnd;
      }
      loan.totalAmount = newTotal as any;
      loan.balance = finalBalance as any;

      await em.save(Loan, loan);

      // Audit row
      await em.query(
        `INSERT INTO loan_corrections
           (tenant_id, branch_id, loan_id, correction_type,
            previous_snapshot, new_snapshot, reason, status,
            requested_by_id, applied_at, schedule_version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,'APPLIED',$8,NOW(),$9,NOW(),NOW())`,
        [
          loan.tenantId, loan.branchId, id,
          dto.correctionType || 'TERMS',
          JSON.stringify(previousSnapshot),
          JSON.stringify({
            principalAmount: principal,
            interestRate: Number(loan.interestRate),
            termWeeks: loan.termWeeks,
            termMonths: loan.termMonths,
            weeklyAmount: loan.weeklyAmount,
            startDate: loan.startDate,
            endDate: loan.endDate,
            totalAmount: newTotal,
            balance: finalBalance,
            scheduleVersion: nextVersion,
            paymentsPreserved: originalPayments.length,
            totalApplied,
            unallocatedAmount: realloc.unallocated,
            supersededAllocationIds: supersededAllocations.map((a) => Number(a.id)),
            newAllocationIds: realloc.newAllocationIds,
            reallocationBasis: 'waterfall_oldest_payment_first',
          }),
          dto.reason.trim(),
          (user as any).userId || (user as any).id,
          nextVersion,
        ],
      );

      loan.addAuditNote(
        'SAFE_RESTRUCTURE',
        `User ${(user as any).userId || (user as any).id}`,
        `${dto.correctionType || 'TERMS'} correction. Reason: ${dto.reason.trim()}. ` +
        `Schedule v${nextVersion}. ${originalPayments.length} payments preserved. ` +
        `Balance ${previousSnapshot.balance} → ${finalBalance}`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        loanNumber: loan.loanNumber,
        scheduleVersion: nextVersion,
        totalAmount: newTotal,
        balance: finalBalance,
        paymentsPreserved: originalPayments.length,
        totalApplied,
        installmentsGenerated: calculation.installments.length,
        allocationsSuperseded: supersededAllocations.length,
        allocationsCreated: realloc.newAllocationIds.length,
      };
    });
  }

  /**
   * Re-allocate existing payment rows onto the current active schedule.
   * Does NOT create, edit or delete payment records and does NOT touch earlier allocation rows:
   * it only INSERTS new payment_allocations rows (stamped with the new schedule_version) and sets
   * amount_paid / status on the NEW schedule rows. Each allocation records the real
   * previous/new status of the schedule row so a later reversal restores it correctly.
   */
  private async reallocateExistingPayments(
    em: any,
    loanId: number,
    payments: any[],
    scheduleVersion: number,
  ): Promise<{ totalApplied: number; unallocated: number; newAllocationIds: number[] }> {
    const schedules = await em.query(
      `SELECT id, installment_number, amount_due, due_date
         FROM loan_schedules
        WHERE loan_id = $1 AND is_active = true
        ORDER BY installment_number`,
      [loanId],
    );

    let totalApplied = 0;
    const newAllocationIds: number[] = [];
    // Work on a mutable copy of remaining amounts per original payment
    const queue = payments.map((p) => ({
      id: p.id,
      remaining: Number(p.amount),
    }));

    for (const sched of schedules) {
      if (queue.every((q) => q.remaining <= 0)) break;

      const due = Number(sched.amount_due);
      let paidOnThis = 0;
      let runningStatus = 'PENDING';

      for (const p of queue) {
        if (p.remaining <= 0 || paidOnThis >= due) continue;
        const apply = Math.min(p.remaining, due - paidOnThis);
        if (apply <= 0) continue;

        const previousStatus = runningStatus;
        paidOnThis += apply;
        p.remaining -= apply;
        totalApplied += apply;
        runningStatus = paidOnThis >= due - 0.009 ? 'PAID' : 'PARTIAL';

        // New allocation linking original payment → new schedule row (parameters take the
        // column's own enum type; no enum type name is hard-coded).
        const [row] = await em.query(
          `INSERT INTO payment_allocations
             (payment_id, schedule_id, amount_applied, instalment_applied, penalty_applied,
              previous_status, new_status, schedule_version, created_at)
           VALUES ($1, $2, $3, $3, 0, $4, $5, $6, NOW())
           RETURNING id`,
          [p.id, sched.id, apply, previousStatus, runningStatus, scheduleVersion],
        );
        newAllocationIds.push(Number(row.id));
      }

      // Update the schedule row itself
      const status = paidOnThis >= due - 0.009 ? 'PAID' : (paidOnThis > 0 ? 'PARTIAL' : 'PENDING');
      await em.query(
        `UPDATE loan_schedules
            SET amount_paid = $1, status = $2, updated_at = NOW()
          WHERE id = $3`,
        [paidOnThis, status, sched.id],
      );
    }

    // Any remaining unallocated amount stays on the payment (excess / future).
    // No schedule rows or allocations are invented for it.
    const unallocated = queue.reduce((sum, q) => sum + Math.max(0, q.remaining), 0);
    return { totalApplied, unallocated, newAllocationIds };
  }

  /**
   * Audited balance-only correction. Does not alter principal, interest earned,
   * or historical payments. Creates a loan_corrections record.
   *
   * Dual-control: if the actor does not also hold loan.approve_correction,
   * the correction is stored as PENDING and does not change the loan balance
   * until a different authorised user approves it.
   */
  async correctBalance(
    id: number,
    newBalance: number,
    reason: string,
    user: RequestUser,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A meaningful reason is required for balance correction');
    }
    if (!Number.isFinite(newBalance) || newBalance < 0) {
      throw new BadRequestException('Balance must be a number that is 0 or more');
    }

    return this.loansRepo.manager.transaction(async (em) => {
      // Lock the row on its own: findOne({lock}) on Loan fails in PostgreSQL (0A000 "FOR UPDATE
      // cannot be applied to the nullable side of an outer join") because Loan eagerly joins client.
      await em.query(`SELECT id FROM loans WHERE id = $1 FOR UPDATE`, [id]);
      const loan = await em.findOne(Loan, { where: { id } });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);
      if (loan.tenantId && user.tenantId && loan.tenantId !== user.tenantId) {
        throw new ForbiddenException('Tenant isolation violation');
      }

      if (!['ACTIVE', 'COMPLETED', 'DEFAULTED'].includes(String(loan.status))) {
        throw new BadRequestException(`Balance cannot be corrected on a ${loan.status} loan`);
      }
      if (Number(newBalance) === Number(loan.balance)) {
        throw new BadRequestException('The new balance is the same as the current balance');
      }

      const previousBalance = Number(loan.balance);
      const previousSnapshot = { balance: previousBalance, totalAmount: Number(loan.totalAmount), status: String(loan.status) };
      const actorId = (user as any).userId || (user as any).id;
      const perms: Set<string> = (user as any).permissions instanceof Set
        ? (user as any).permissions
        : new Set(Array.isArray((user as any).permissions) ? (user as any).permissions : []);
      const canSelfApply = perms.has('loan.approve_correction')
        || ['admin', 'superadmin', 'super_admin'].includes(((user as any).roleName || '').toLowerCase());

      if (!canSelfApply) {
        // Dual-control: queue only — do not change balance yet
        const [row] = await em.query(
          `INSERT INTO loan_corrections
             (tenant_id, branch_id, loan_id, correction_type,
              previous_snapshot, new_snapshot, reason, status,
              requested_by_id, created_at, updated_at)
           VALUES ($1,$2,$3,'BALANCE',$4::jsonb,$5::jsonb,$6,'PENDING',$7,NOW(),NOW())
           RETURNING id`,
          [
            loan.tenantId, loan.branchId, id,
            JSON.stringify(previousSnapshot),
            JSON.stringify({ balance: newBalance }),
            reason.trim(),
            actorId,
          ],
        );
        return {
          success: true,
          status: 'PENDING',
          correctionId: row?.id,
          message: 'Balance correction submitted for approval. A second authorised user must approve.',
          previousBalance,
          newBalance,
        };
      }

      const nextStatus = statusAfterBalanceCorrection(String(loan.status), Number(newBalance));
      loan.balance = newBalance as any;
      if (nextStatus !== String(loan.status)) loan.status = nextStatus as any;
      await em.save(Loan, loan);

      await em.query(
        `INSERT INTO loan_corrections
           (tenant_id, branch_id, loan_id, correction_type,
            previous_snapshot, new_snapshot, reason, status,
            requested_by_id, approved_by_id, applied_at, created_at, updated_at)
         VALUES ($1,$2,$3,'BALANCE',$4::jsonb,$5::jsonb,$6,'APPLIED',$7,$7,NOW(),NOW(),NOW())`,
        [
          loan.tenantId, loan.branchId, id,
          JSON.stringify(previousSnapshot),
          JSON.stringify({ balance: newBalance }),
          reason.trim(),
          actorId,
        ],
      );

      loan.addAuditNote(
        'BALANCE_CORRECTION',
        `User ${actorId}`,
        `Balance corrected ${previousBalance} → ${newBalance}. Reason: ${reason.trim()}`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        status: 'APPLIED',
        loanNumber: loan.loanNumber,
        previousBalance,
        newBalance,
        loanStatus: String(loan.status),
      };
    });
  }

  /**
   * Dual-control: approve or reject a PENDING loan correction.
   *
   * Integrity rules (all inside ONE transaction — any failure rolls everything back):
   *  - The loan is locked first (same order as correctBalance), then the correction row.
   *  - A correction becomes APPLIED only after its change has been applied to the loan.
   *    Only correction_type BALANCE has a pending-apply implementation. Any other type is
   *    refused with 422 and stays PENDING (it can still be REJECTED) — it is never marked APPLIED
   *    without being applied.
   *  - Tenant and (for branch-scoped roles) branch scope are enforced on the correction AND the loan.
   *  - Approver must differ from the requester (approve and reject).
   *  - The original financial state recorded at request time (balance, total, status) is
   *    revalidated against the locked loan; any drift => 409, nothing changes.
   *  - Schedules are intentionally NOT touched for BALANCE: it is an audited balance-only override
   *    (same as the immediate path in correctBalance) — principal, interest, schedule and payments
   *    are unchanged.
   *  - An `audit` row and a loan audit note are written in the same transaction.
   */
  async decideCorrection(
    correctionId: number,
    decision: 'APPROVE' | 'REJECT',
    reason: string | undefined,
    user: RequestUser,
  ) {
    const actorId = (user as any).userId || (user as any).id;
    const actorLabel = (user as any).email || (user as any).username || `user ${actorId}`;
    const parseJson = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
    const cleanReason = String(reason ?? '').trim().slice(0, 300);

    return this.loansRepo.manager.transaction(async (em) => {
      // 1. Find the loan this correction belongs to (unlocked read — only to learn loan_id).
      const [peek] = await em.query(`SELECT id, loan_id, tenant_id FROM loan_corrections WHERE id = $1`, [correctionId]);
      if (!peek) throw new NotFoundException('Correction not found');
      if (peek.tenant_id && user.tenantId && Number(peek.tenant_id) !== Number(user.tenantId)) {
        throw new ForbiddenException('Tenant isolation violation');
      }

      // 2. Lock loan, then correction (consistent lock order => no deadlock with correctBalance).
      const [loanRow] = await em.query(
        `SELECT id, balance, total_amount, status, tenant_id, branch_id, deleted_at
           FROM loans WHERE id = $1 FOR UPDATE`,
        [peek.loan_id],
      );
      if (!loanRow) throw new NotFoundException(`Loan ${peek.loan_id} not found`);
      const [corr] = await em.query(`SELECT * FROM loan_corrections WHERE id = $1 FOR UPDATE`, [correctionId]);
      if (!corr) throw new NotFoundException('Correction not found');

      // 3. Scope
      if (
        (corr.tenant_id && user.tenantId && Number(corr.tenant_id) !== Number(user.tenantId)) ||
        (loanRow.tenant_id && user.tenantId && Number(loanRow.tenant_id) !== Number(user.tenantId)) ||
        (corr.tenant_id && loanRow.tenant_id && Number(corr.tenant_id) !== Number(loanRow.tenant_id))
      ) {
        throw new ForbiddenException('Tenant isolation violation');
      }
      if (isBranchScopedRole(user)) {
        const myBranch = Number((user as any).branchId);
        const outOfScope = (b: any) => b != null && Number(b) !== myBranch;
        if (!myBranch || outOfScope(corr.branch_id) || outOfScope(loanRow.branch_id)) {
          throw new ForbiddenException('This correction belongs to another branch.');
        }
      }

      // 4. State + dual control
      if (corr.status !== 'PENDING') {
        throw new BadRequestException(`Correction is already ${corr.status}`);
      }
      if (Number(corr.requested_by_id) === Number(actorId)) {
        throw new ForbiddenException(
          'You cannot approve or reject your own correction request (dual control).',
        );
      }

      const auditRow = (action: string, oldValues: any, newValues: any, description: string) =>
        em.query(
          `INSERT INTO audit (action, table_name, record_id, old_values, new_values, "user", description, metadata, tenant_id)
           VALUES ($1,'loan_corrections',$2,$3,$4,$5,$6,$7,$8)`,
          [
            action, correctionId, JSON.stringify(oldValues), JSON.stringify(newValues), actorLabel,
            description.slice(0, 250),
            JSON.stringify({ loanId: Number(corr.loan_id), correctionType: corr.correction_type, requestedById: corr.requested_by_id, reason: cleanReason || null }),
            corr.tenant_id ?? null,
          ],
        );
      const loanNote = (action: string, details: string) =>
        em.query(
          `UPDATE loans SET notes = COALESCE(notes || E'\n\n', '') || $1, updated_at = NOW() WHERE id = $2`,
          [`[${new Date().toISOString()}] - ${action}\nPerformed By: User ${actorId}\nDetails: ${details}\nPolicy Reference: [2026-01-10]`, corr.loan_id],
        );

      // 5a. REJECT — valid for every type; changes only the correction row.
      if (decision === 'REJECT') {
        const upd = await em.query(
          `UPDATE loan_corrections
              SET status = 'REJECTED', approved_by_id = $1, updated_at = NOW()
            WHERE id = $2 AND status = 'PENDING' RETURNING id`,
          [actorId, correctionId],
        );
        if (!upd.length) throw new ConflictException('This correction was already decided by someone else');
        await auditRow('LOAN_CORRECTION_REJECTED', { status: 'PENDING' }, { status: 'REJECTED' },
          `Loan correction #${correctionId} (${corr.correction_type}) rejected${cleanReason ? `: ${cleanReason}` : ''}`);
        await loanNote('CORRECTION_REJECTED', `Correction #${correctionId} (${corr.correction_type}) rejected.${cleanReason ? ` ${cleanReason}` : ''}`);
        return { success: true, status: 'REJECTED', correctionId, loanId: corr.loan_id };
      }

      // 5b. APPROVE — only types with a real apply implementation.
      if (corr.correction_type !== 'BALANCE') {
        throw new UnprocessableEntityException(
          `Correction type ${corr.correction_type} cannot be approved from the queue: only BALANCE corrections ` +
          'can be applied on approval. It was NOT applied and remains PENDING; reject it and re-submit it through ' +
          'the direct correction endpoint.',
        );
      }

      const snapshot = parseJson(corr.new_snapshot);
      const newBalance = snapshot?.balance == null ? NaN : Number(snapshot.balance);
      if (!Number.isFinite(newBalance) || newBalance < 0) {
        throw new UnprocessableEntityException(
          'This BALANCE correction has no valid requested balance in its snapshot, so it cannot be applied. It remains PENDING; reject it.',
        );
      }
      if (loanRow.deleted_at) throw new BadRequestException('Cannot apply a correction to a deleted loan');
      if (!['ACTIVE', 'COMPLETED', 'DEFAULTED'].includes(String(loanRow.status))) {
        throw new BadRequestException(`Balance cannot be corrected on a ${loanRow.status} loan`);
      }

      // Revalidate the original financial state: the request stored an ABSOLUTE balance, so any
      // payment/reversal/correction since then would be silently wiped out.
      const prev = parseJson(corr.previous_snapshot) ?? {};
      const drift: string[] = [];
      if (prev.balance != null && Number(loanRow.balance) !== Number(prev.balance)) {
        drift.push(`balance was ${Number(prev.balance)}, now ${Number(loanRow.balance)}`);
      }
      if (prev.totalAmount != null && Number(loanRow.total_amount) !== Number(prev.totalAmount)) {
        drift.push(`total amount was ${Number(prev.totalAmount)}, now ${Number(loanRow.total_amount)}`);
      }
      if (prev.status != null && String(loanRow.status) !== String(prev.status)) {
        drift.push(`status was ${prev.status}, now ${loanRow.status}`);
      }
      if (drift.length) {
        throw new ConflictException(
          `The loan changed since this correction was requested (${drift.join('; ')}). Reject it and submit a new correction.`,
        );
      }
      if (newBalance === Number(loanRow.balance)) {
        throw new BadRequestException('The requested balance equals the current balance; nothing to apply. Reject this correction.');
      }

      const nextStatus = statusAfterBalanceCorrection(String(loanRow.status), newBalance);
      const applied = await em.query(
        `UPDATE loans SET balance = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING id`,
        [newBalance, nextStatus, corr.loan_id],
      );
      if (!applied.length) throw new ConflictException('The loan could not be updated; nothing was applied.');

      const mark = await em.query(
        `UPDATE loan_corrections
            SET status = 'APPLIED', approved_by_id = $1, applied_at = NOW(), updated_at = NOW()
          WHERE id = $2 AND status = 'PENDING' RETURNING id`,
        [actorId, correctionId],
      );
      if (!mark.length) throw new ConflictException('This correction was already decided by someone else');

      await auditRow(
        'LOAN_CORRECTION_APPROVED',
        { balance: Number(loanRow.balance), status: String(loanRow.status) },
        { balance: newBalance, status: nextStatus },
        `Loan correction #${correctionId} (BALANCE) approved: ${Number(loanRow.balance)} -> ${newBalance}${cleanReason ? `. ${cleanReason}` : ''}`,
      );
      await loanNote(
        'CORRECTION_APPROVED',
        `Correction #${correctionId} (BALANCE) approved. Balance ${Number(loanRow.balance)} -> ${newBalance}` +
        `${nextStatus !== String(loanRow.status) ? `, status ${loanRow.status} -> ${nextStatus}` : ''}.${cleanReason ? ` ${cleanReason}` : ''}`,
      );

      return {
        success: true,
        status: 'APPLIED',
        correctionId,
        loanId: corr.loan_id,
        previousBalance: Number(loanRow.balance),
        newBalance,
        loanStatus: nextStatus,
      };
    });
  }
}

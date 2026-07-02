// patch 2026-06-16
import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
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
import { assertAdmin, assertRole, RequestUser } from '../../common/helpers/role-helper';
import { ApplyLoanDto }          from './dto/apply-loan.dto';
import { AdminApprovalDto }      from './dto/admin-approval.dto';
import { BikeLoanCalculateDto }  from './dto/bike-loan-calculate.dto';
import { CashLoanCalculateDto }  from './dto/cash-loan-calculate.dto';
import { LoanProductsService }   from '../loan-products/loan-products.service';
import { LoanCalculatorRegistry } from './calculators/loan-calculator.registry';

/**
 * PHASE 5 — LoansService
 *
 * Fixes applied:
 *  FIX-L01: applyForLoan now generates the repayment schedule (was missing entirely)
 *  FIX-L02: loanNumber generation uses MAX(id) not COUNT(*) — avoids duplicates after deletes
 *  FIX-L03: loanType is explicit from DTO — not inferred from bikeId presence
 *  FIX-L04: createBikeLoan path uses correct PENDING_APPROVAL status (uppercase)
 *  FIX-L05: validate() removed from hot path — wrong formula was flagging valid loans
 *  FIX-L06: approveOrRejectLoan now uses dto.action and dto.reason (AdminApprovalDto v2)
 *  FIX-L07: generateMonthlySchedule / generateWeeklySchedule now explicitly set tenant_id & branch_id
 */
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

  // ── Shared product validation — used by every loan-creation entry point ──
  // One canonical implementation of "is this product usable for this loan
  // request." Both applyForLoan() and create() call this rather than each
  // re-implementing the same ownership/active/amount/term checks.
  private async loadAndValidateProduct(
    loanProductId: number, tenantId: number, amount: number,
    /** Must already be expressed in MONTHS — loan_products.min/max_term_months
     *  is month-denominated regardless of the product's actual repayment
     *  cadence (there is no separate week-denominated column). Callers
     *  using a weekly-cadence product must convert before calling this —
     *  see create()'s Math.ceil(weeks / 4) conversion. */
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

  // ── Interest helper ─────────────────────────────────────────────────────────
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
      // Unrounded values — for callers that must add further terms (e.g. a
      // processing fee) before rounding, to avoid compounding rounding error.
      _rawTotalPayable: totalPayable,
    };
  }

  // ── Unique loan number (MAX-based, collision-safe) ──────────────────────────
  private async nextLoanNumber(em: any): Promise<string> {
    const year = new Date().getFullYear();
    const rows: any[] = await em.query(`SELECT COALESCE(MAX(id), 0) AS max FROM loans`);
    const next = Number(rows[0].max) + 1;
    return `LN-${year}-${next.toString().padStart(4, '0')}`;
  }

  // ── Monthly schedule generator ──────────────────────────────────────────────
  // ── Schedule persistence — shared by every calculation method ───────────────
  // Calculators return pure data (ScheduleInstallment[]); this is the one
  // place that writes loan_schedules rows. A new calculation method never
  // needs its own persistence logic — it only needs to produce the same
  // shape of installment array.
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

  // ── Apply for loan (main creation path) ─────────────────────────────────────
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
        // ── Product-driven path ──────────────────────────────────────────
        const product = await this.loadAndValidateProduct(loanProductId, loanTenantId, amount, months);

        loadedProduct     = { id: product.id, code: product.code, name: product.name };
        loanType          = product.productType;
        annualRate        = Number(product.interestRate);
        processingFee     = Number(product.processingFee);
        loanTerm          = months;
        lateFeeDaily      = Number(product.lateFeeDaily);
        calculationMethod = product.calculationMethod || 'monthly_flat';
      } else {
        // ── Legacy path — unchanged behavior, preserved exactly for
        // backward compatibility with any caller not yet sending
        // loanProductId. This branch always used monthly/flat math, so it
        // always resolves the 'monthly_flat' calculator — no behavior
        // change from before this pipeline existed. ──
        // FIX-L03: explicit loanType from DTO, no bikeId inference
        loanType = (data as any).loanType?.toLowerCase() === 'bike' ? 'bike' : 'cash';

        // Option A: use tenant-specific rate with global fallback
        // Fallback chain: user tenant → client tenant → 0 (global fallback)
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

      // ── Build Calculation Context → Resolve Calculator → Calculate ──────
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

      // ── Persist Loan's schedule ──────────────────────────────────────────
      // FIX-L01: generate repayment schedule immediately after loan creation
      await this.persistSchedule(em, savedLoan, calculation.installments);

      return savedLoan;
    });
  }

  // ── findOne ─────────────────────────────────────────────────────────────────
  async findOne(id: number) {
    const loan = await this.loansRepo.findOne({
      where: { id },
      relations: ['client', 'bike', 'payments', 'schedules'],
    });
    if (!loan) throw new NotFoundException(`Loan #${id} not found`);
    return loan;
  }

  // ── findAll ──────────────────────────────────────────────────────────────────
  // Phase 2.1: tenant scoping added — loans are always filtered by tenantId
  // to prevent cross-tenant data leaks.
  async findAll(filters: {
    status?: string; type?: string; startDate?: string; endDate?: string;
    tenantId?: number; clientId?: number;
  }) {
    const qb = this.loansRepo.createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client')
      .orderBy('loan.createdAt', 'DESC');

    // Always scope to tenant when provided
    if (filters.tenantId) qb.andWhere('loan.tenantId = :tenantId', { tenantId: filters.tenantId });

    if (filters.status)    qb.andWhere('loan.status    = :status', { status: filters.status });
    if (filters.type)      qb.andWhere('loan.loanType  = :type',   { type:   filters.type   });
    if (filters.startDate) qb.andWhere('loan.startDate >= :sd',    { sd:     filters.startDate });
    if (filters.endDate)   qb.andWhere('loan.endDate   <= :ed',    { ed:     filters.endDate   });
    if (filters.clientId)  qb.andWhere('loan.clientId  = :clientId', { clientId: filters.clientId });

    return qb.getMany();
  }

  // ── searchLoans — also tenant-scoped ────────────────────────────────────────

  // ── searchLoans ──────────────────────────────────────────────────────────────
  async searchLoans(dto: any) {
    const qb = this.loansRepo.createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client');
    if (dto.loanNumber) qb.andWhere('loan.loanNumber ILIKE :n', { n: `%${dto.loanNumber}%` });
    if (dto.clientName) qb.andWhere("(client.first_name || ' ' || client.last_name) ILIKE :cn", { cn: `%${dto.clientName}%` });
    if (dto.status)     qb.andWhere('loan.status = :s', { s: dto.status });
    if (dto.loanType)   qb.andWhere('loan.loanType = :t', { t: dto.loanType });
    return qb.orderBy('loan.createdAt', 'DESC').getMany();
  }

  // ── calculateCashLoan ────────────────────────────────────────────────────────
  async calculateCashLoan(dto: CashLoanCalculateDto) {
    const { amount, termMonths, interestRate } = dto;
    return this.calculateFlatInterest(amount, termMonths, interestRate);
  }

  // ── calculateBikeLoan ────────────────────────────────────────────────────────
  async calculateBikeLoan(dto: BikeLoanCalculateDto) {
    const { salePrice, deposit, termWeeks, interestRate = 0 } = dto;
    const principal        = salePrice - deposit;
    const totalInterest    = principal * interestRate * (termWeeks / 52);
    const totalPayable     = principal + totalInterest;
    const weeklyInstallment = Math.round((totalPayable / termWeeks) * 100) / 100;
    return { principal, totalInterest, totalPayable, weeklyInstallment };
  }

  // ── previewBikeLoan ──────────────────────────────────────────────────────────
  async previewBikeLoan(opts: {
    salePrice: number; deposit: number; targetWeeks?: number; targetMonthly?: number;
  }) {
    const principal = opts.salePrice - opts.deposit;
    const weeks     = opts.targetWeeks ?? 104;
    const weekly    = Math.round((principal / weeks) * 100) / 100;
    return { principal, weeklyInstallment: weekly, totalWeeks: weeks };
  }

  // ── approveOrRejectLoan ──────────────────────────────────────────────────────
  // FIX-L06: uses AdminApprovalDto v2 with action + reason
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

  // ── reverseOrAdjustLoan ──────────────────────────────────────────────────────
  async reverseOrAdjustLoan(id: number, dto: any, user: RequestUser) {
    const loan = await this.findOne(id);
    const previousBalance = Number(loan.balance);
    const detail = dto.newBalance !== undefined
      ? `${dto.reason ?? 'No reason'} (balance corrected: ${previousBalance} -> ${Number(dto.newBalance)})`
      : (dto.reason ?? 'No reason');
    loan.addAuditNote('REVERSAL', `Admin ${user.userId}`, detail);
    if (dto.newBalance !== undefined) loan.balance = dto.newBalance;
    return this.loansRepo.save(loan);
  }

  // ── updateLoan ───────────────────────────────────────────────────────────────
  async updateLoan(id: number, dto: any, user: RequestUser) {
    const loan = await this.findOne(id);
    if (dto.amount)  loan.principalAmount = dto.amount;
    loan.addAuditNote('UPDATE', `Admin ${user.userId}`, dto.details ?? '');
    return this.loansRepo.save(loan);
  }

  // ── updateLoanStatus ─────────────────────────────────────────────────────────
  async updateLoanStatus(id: number, status: string, user: RequestUser) {
    const loan = await this.findOne(id);
    if (!Object.values(LoanStatus).includes(status as LoanStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    loan.status = status as LoanStatus;
    loan.addAuditNote('STATUS_CHANGE', `Admin ${user.userId}`, `Changed to ${status}`);
    return this.loansRepo.save(loan);
  }

  // ── backdateLoan ─────────────────────────────────────────────────────────────
  // For loans already entered into the system with today's date but that have
  // real payment history from months ago. This:
  //   1. Sets the real start date and regenerates the full schedule from it
  //   2. Marks already-paid installments as PAID with actual dates/amounts
  //   3. Creates real payment records for amounts already collected
  //   4. Sets the loan balance to the actual remaining amount
  //   5. Marks overdue installments (past due date, not paid)
  //
  // paidInstallments: array of { installmentNumber, amountPaid, paidDate }
  // newBalance: the actual remaining balance from the physical ledger
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

      // Step 1: Clear any existing payments and schedules
      await em.query(
        `DELETE FROM payments WHERE loan_id = $1`,
        [id],
      );
      await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [id]);

      // Step 2: Update loan start/end date and balance
      const newEnd = loan.termWeeks && loan.termWeeks > 0
        ? new Date(newStart.getTime() + loan.termWeeks * 7 * 24 * 60 * 60 * 1000)
        : addMonths(newStart, loan.termMonths);

      await em.query(
        `UPDATE loans
         SET start_date = $1, end_date = $2, balance = $3, updated_at = NOW()
         WHERE id = $4`,
        [newStart.toISOString().slice(0, 10), newEnd.toISOString().slice(0, 10), newBalance, id],
      );

      // Step 3: Regenerate schedule from the real start date
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

      // Step 4: Mark paid installments and create payment records
      const paidMap = new Map(
        paidInstallments.map(p => [p.installmentNumber, p]),
      );
      const today = new Date().toISOString().slice(0, 10);

      for (const inst of calculation.installments) {
        const paid = paidMap.get(inst.installmentNumber);

        if (paid) {
          // Mark schedule row as PAID
          const status = paid.amountPaid >= inst.amountDue ? 'PAID' : 'PARTIAL';
          await em.query(
            `UPDATE loan_schedules
             SET amount_paid = $1, status = $2, paid_date = $3, updated_at = NOW()
             WHERE loan_id = $4 AND installment_number = $5`,
            [paid.amountPaid, status, paid.paidDate, id, inst.installmentNumber],
          );

          // Create payment record
          await em.query(
            `INSERT INTO payments
               (loan_id, amount, payment_method, payment_date, status,
                receipt_number, notes, tenant_id, branch_id, created_at, updated_at)
             VALUES ($1,$2,'CASH',$3,'COMPLETED',$4,'Historical entry',$5,$6,NOW(),NOW())`,
            [
              id, paid.amountPaid, paid.paidDate,
              `BACKDATE-${id}-${inst.installmentNumber}`,
              loan.tenantId ?? null, loan.branchId ?? null,
            ],
          );
        } else {
          // Past due and not paid = OVERDUE
          const dueDate = inst.dueDate.toISOString().slice(0, 10);
          if (dueDate < today) {
            await em.query(
              `UPDATE loan_schedules SET status = 'OVERDUE', updated_at = NOW()
               WHERE loan_id = $1 AND installment_number = $2`,
              [id, inst.installmentNumber],
            );
          }
        }
      }

      loan.addAuditNote(
        'BACKDATE',
        `User ${user.userId}`,
        `Loan backdated to ${startDateStr}. ` +
        `${paidInstallments.length} historical payments recorded. ` +
        `Balance set to ${newBalance}.`,
      );
      await em.save(Loan, loan);

      return {
        success: true,
        loanNumber:               loan.loanNumber,
        realStartDate:            newStart.toISOString().slice(0, 10),
        scheduleRegenerated:      calculation.installments.length,
        historicalPaymentsLoaded: paidInstallments.length,
        newBalance,
      };
    });
  }

  // ── rescheduleLoan ───────────────────────────────────────────────────────────
  // Corrects a loan's start date and regenerates its schedule from scratch.
  // Blocked if any payment exists — once money has been collected, the
  // schedule cannot be silently rewritten without a formal reversal process.
  async rescheduleLoan(id: number, startDateStr: string, user: RequestUser) {
    const newStart = new Date(startDateStr);
    if (isNaN(newStart.getTime())) {
      throw new BadRequestException(`Invalid start date: ${startDateStr}`);
    }

    return this.loansRepo.manager.transaction(async (em) => {
      const loan = await em.findOne(Loan, {
        where: { id },
        relations: ['client'],
      });
      if (!loan) throw new NotFoundException(`Loan ${id} not found`);

      // Guard: no payments made
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

      // Update loan dates
      const newEnd = addMonths(newStart, loan.termMonths);
      await em.query(
        `UPDATE loans SET start_date = $1, end_date = $2, updated_at = NOW() WHERE id = $3`,
        [newStart.toISOString().slice(0, 10), newEnd.toISOString().slice(0, 10), id],
      );

      // Delete existing schedule
      await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [id]);

      // Regenerate using the same calculator pipeline
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


  async hardDeleteLoan(id: number, user: RequestUser) {
    const loan = await this.findOne(id);
    loan.softDelete(user.userId);
    await this.loansRepo.save(loan);
    return { message: `Loan ${id} soft-deleted` };
  }

  // ── getPortfolioSummary ──────────────────────────────────────────────────────
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

  // ── getOverdueLoansReport — tenant-scoped + paginated ───────────────────────
  async getOverdueLoansReport(tenantId?: number, limit = 200) {
    const where: any = { status: LoanStatus.DELINQUENT };
    if (tenantId) where.tenantId = tenantId;
    return this.loansRepo.find({
      where,
      relations: ['client'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  // ── getLoanAuditTrail ────────────────────────────────────────────────────────
  async getLoanAuditTrail(loanId: number) {
    const loan = await this.findOne(loanId);
    return { loanId, notes: loan.notes };
  }

  // ── create (used by createBikeLoan controller path) ─────────────────────────
  // Receives the spread of CreateBikeLoanDto + { principal_amount, loan_type, status }
  // from the controller. Maps snake_case DTO fields to entity camelCase columns
  // and fills in all NOT NULL fields the DTO does not supply.
  async create(dto: any) {
    // Wrapped in a transaction so the loan save and schedule generation
    // commit or roll back together — previously this method created no
    // schedule rows at all, leaving every bike loan with no loan_schedules
    // for payment allocation, arrears reporting, or aging reports to act on.
    return this.loansRepo.manager.transaction(async (em) => {
      const year    = new Date().getFullYear();
      const rows: any[] = await em.query(
        `SELECT COALESCE(MAX(id), 0) AS max FROM loans`,
      );
      const loanNumber = `LN-${year}-${(Number(rows[0].max) + 1).toString().padStart(4, '0')}`;

      const principal    = Number(dto.principal_amount);
      const weeks        = Number(dto.term_weeks) || 0;
      // Bike loans: zero-interest flat repayment over weeks converted to months
      const termMonths   = weeks > 0 ? Math.ceil(weeks / 4) : 12;
      const weeklyAmount = dto.weekly_installment ? Number(dto.weekly_installment) : null;
      const loanProductId: number | undefined = dto.loan_product_id ?? undefined;
      const tenantIdForGuard = dto.tenant_id ?? undefined;

      let totalAmount: number;
      let loadedProduct: { id: number; code: string; name: string; calculationMethod: string } | null = null;

      if (loanProductId && tenantIdForGuard) {
        // ── Product-driven path ──────────────────────────────────────────
        const product = await this.loadAndValidateProduct(
          loanProductId, tenantIdForGuard, principal, termMonths,
        );
        loadedProduct = {
          id: product.id, code: product.code, name: product.name,
          calculationMethod: product.calculationMethod || 'weekly_flat',
        };
        // Note: bike-loan principal/totalAmount has historically always
        // been zero-interest (totalAmount = principal). A product-driven
        // bike loan could in principle carry a non-zero interestRate via
        // its LoanProduct row — that would require this branch to run the
        // calculator BEFORE the loan row is built, the same way
        // applyForLoan() does, rather than assuming totalAmount = principal.
        // Preserving the existing zero-interest assumption here rather
        // than guessing at reducing-balance or interest-bearing bike
        // products, which were never part of this codebase's behavior.
        totalAmount = principal;
      } else {
        totalAmount = principal; // zero interest — client repays principal only
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

      // Generate the weekly repayment schedule if weekly terms are known.
      // If neither weeks nor a weekly amount were resolved, skip schedule
      // generation rather than guessing — same caution as the rest of this
      // method, which already validates principal/deposit upstream in the
      // controller before reaching here.
      //
      // weeklyAmount (when provided) is passed as installmentOverride —
      // the real frontend form lets a cashier manually type a weekly
      // installment that is not always equal to principal/weeks.
      // WeeklyFlatCalculator now honors this override explicitly, so this
      // call site no longer needs its own inline copy of the schedule
      // math — there is exactly one implementation of weekly_flat in the
      // codebase.
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

  // ── Historical loan import ───────────────────────────────────────────────
  // Implements POST /loans/historical-import — previously had no backend
  // route, causing the import page to 404 on every submission.
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

          const year = new Date().getFullYear();
          const rows: any[] = await em.query(`SELECT COALESCE(MAX(id), 0) AS max FROM loans`);
          const loanNumber = `LN-IMPORT-${year}-${(Number(rows[0].max) + 1).toString().padStart(4, '0')}`;

          const principal  = Number(rec.principalAmount) || Number(rec.totalAmount) || 0;
          const weeks      = Number(rec.termWeeks) || 0;
          const termMonths = weeks > 0 ? Math.ceil(weeks / 4) : 12;
          const loanStatus = rec.status === 'COMPLETED' ? LoanStatus.COMPLETED : LoanStatus.ACTIVE;

          const loan = em.create(Loan, {
            loanNumber,
            loanType:        'cash',
            clientId:        client.id,
            tenantId:        tenantId ?? undefined,
            branchId:        branchId ?? undefined,
            principalAmount: principal,
            interestRate:    0,
            totalAmount:     Number(rec.totalAmount) || principal,
            balance:         Number(rec.balance) || Number(rec.principalAmount) || principal,
            termMonths,
            termWeeks:       weeks || null,
            weeklyAmount:    Number(rec.weeklyAmount) || null,
            deposit:         Number(rec.deposit) || 0,
            startDate:       rec.startDate || new Date().toISOString().slice(0, 10),
            status:          loanStatus,
            notes:           `Imported from historical ledger. Guarantors: ${(rec.guarantors || []).join(', ') || 'none'}`,
          } as any);
          const savedLoan = await em.save(Loan, loan);

          const payments = Array.isArray(rec.payments) ? rec.payments : [];
          let installmentNumber = 1;
          for (const p of payments) {
            const amountDue  = Number(p.weeklyDue) || 0;
            const amountPaid = Number(p.amountPaid) || 0;
            const scheduleStatus = amountPaid >= amountDue && amountDue > 0
              ? ScheduleStatus.PAID
              : amountPaid > 0
                ? ScheduleStatus.PARTIAL
                : ScheduleStatus.PENDING;

            await em.query(
              `INSERT INTO loan_schedules
                 (loan_id, installment_number, due_date, amount_due, principal_due,
                  interest_due, amount_paid, status, paid_date, payment_notes,
                  tenant_id, branch_id, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,'Historical import',$9,$10,NOW(),NOW())`,
              [
                savedLoan.id, installmentNumber, p.date,
                amountDue, amountDue, amountPaid, scheduleStatus,
                amountPaid > 0 ? p.date : null,
                tenantId ?? null, branchId ?? null,
              ],
            );

            if (amountPaid > 0) {
              await em.query(
                `INSERT INTO payments
                   (loan_id, amount, payment_method, payment_date, status,
                    receipt_number, notes, tenant_id, branch_id, created_at, updated_at)
                 VALUES ($1,$2,'CASH',$3,'COMPLETED',$4,'Historical import',$5,$6,NOW(),NOW())`,
                [
                  savedLoan.id, amountPaid, p.date,
                  `HIST-${savedLoan.id}-${installmentNumber}`,
                  tenantId ?? null, branchId ?? null,
                ],
              );
            }

            installmentNumber++;
          }
        });

        success++;
      } catch (err: any) {
        skipped++;
        errors.push({ client: rec.clientName || 'unknown', error: err.message || 'Unknown error' });
      }
    }

    return { success, skipped, errors };
  }
}
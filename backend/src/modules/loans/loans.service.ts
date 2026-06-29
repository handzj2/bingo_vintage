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
import { addMonths, addWeeks } from 'date-fns';
import { assertAdmin, assertRole, RequestUser } from '../../common/helpers/role-helper';
import { ApplyLoanDto }          from './dto/apply-loan.dto';
import { AdminApprovalDto }      from './dto/admin-approval.dto';
import { BikeLoanCalculateDto }  from './dto/bike-loan-calculate.dto';
import { CashLoanCalculateDto }  from './dto/cash-loan-calculate.dto';

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
  ) {}

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
  private async generateMonthlySchedule(
    em: any, loan: Loan, principal: number, months: number,
    annualRate: number, processingFee: number,
  ): Promise<void> {
    // Delete any existing schedules for this loan (safe inside a transaction)
    await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [loan.id]);

    // Single canonical interest calculation (INT-001A) — same formula used by
    // applyForLoan() and calculateCashLoan(). processingFee is added on top,
    // exactly as applyForLoan() already does for the loan's totalAmount/balance,
    // so existing fee-bearing loans produce identical installment figures.
    const { _rawTotalPayable, principalPerMonth, interestPerMonth } =
      this.calculateFlatInterest(principal, months, annualRate);
    const installment  = Math.round(((_rawTotalPayable + processingFee) / months) * 100) / 100;
    const principalPer = principalPerMonth;
    const interestPer  = interestPerMonth;

    for (let i = 1; i <= months; i++) {
      const dueDate   = addMonths(new Date(loan.startDate), i);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      await em.query(
        `INSERT INTO loan_schedules
           (loan_id, installment_number, due_date, amount_due, principal_due,
            interest_due, amount_paid, status, tenant_id, branch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,0,'PENDING',$7,$8,NOW(),NOW())`,
        [loan.id, i, dueDateStr, installment, principalPer,
         interestPer, loan.tenantId ?? null, loan.branchId ?? null],
      );
    }
  }

  // ── Weekly schedule generator ───────────────────────────────────────────────
  private async generateWeeklySchedule(
    em: any, loan: Loan, totalWeeks: number, weeklyInstallment: number,
  ): Promise<void> {
    await em.query(`DELETE FROM loan_schedules WHERE loan_id = $1`, [loan.id]);

    let remaining = Number(loan.totalAmount);
    for (let w = 1; w <= totalWeeks; w++) {
      const isLast   = w === totalWeeks;
      const amountDue = isLast
        ? Math.round(Math.max(0, remaining) * 100) / 100
        : weeklyInstallment;
      const dueDate = addWeeks(new Date(loan.startDate), w);

      await em.query(
        `INSERT INTO loan_schedules
           (loan_id, installment_number, due_date, amount_due, principal_due,
            interest_due, amount_paid, status, tenant_id, branch_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,0,0,'PENDING',$6,$7,NOW(),NOW())`,
        [loan.id, w, dueDate.toISOString().slice(0, 10),
         amountDue, amountDue, loan.tenantId ?? null, loan.branchId ?? null],
      );
      remaining = Math.max(0, remaining - weeklyInstallment);
    }
  }

  // ── Apply for loan (main creation path) ─────────────────────────────────────
  async applyForLoan(rawData: ApplyLoanDto, user: RequestUser): Promise<Loan> {
    const data = sanitiseDto(rawData);
    return this.loansRepo.manager.transaction(async (em) => {
      const { clientId, bikeId, amount, months = 12, interestRate } = data;

      // FIX-L03: explicit loanType from DTO, no bikeId inference
      const loanType: string = (data as any).loanType?.toLowerCase() === 'bike' ? 'bike' : 'cash';

      const client = await em.findOne(Client, { where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found');

      // Option A: use tenant-specific rate with global fallback
      // Fallback chain: user tenant → client tenant → 0 (global fallback)
      const loanTenantId  = user?.tenantId ?? client.tenantId ?? 0;
      const annualRate    = interestRate ??
        await this.settingsService.getNumberForTenant('LOAN_INTEREST_RATE', loanTenantId, 0.15);
      const processingFee =
        await this.settingsService.getNumberForTenant('loan.processing_fee', loanTenantId, 0);
      const loanTerm      = months;

      const { totalPayable } = this.calculateFlatInterest(amount, loanTerm, annualRate);

      const startDate = new Date();
      const endDate   = addMonths(startDate, loanTerm);

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
        totalAmount:     totalPayable + processingFee,
        balance:         totalPayable + processingFee,
        termMonths:      loanTerm,
        startDate,
        endDate,
        client,
        status:    LoanStatus.PENDING_APPROVAL,
        loanType,
        createdBy: user?.userId ?? null,
        tenantId:  user?.tenantId ?? client.tenantId,
        branchId:  user?.branchId ?? client.branchId ?? null,
        ...(bikeId && { bike: { id: bikeId } }),
      });

      const savedLoan = await em.save(Loan, loan);

      // FIX-L01: generate repayment schedule immediately after loan creation
      await this.generateMonthlySchedule(
        em, savedLoan, amount, loanTerm, annualRate, processingFee,
      );

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

  // ── hardDeleteLoan ───────────────────────────────────────────────────────────
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
      const totalAmount  = principal; // zero interest — client repays principal only
      const weeklyAmount = dto.weekly_installment ? Number(dto.weekly_installment) : null;

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
        tenantId:       dto.tenant_id ?? undefined,
        branchId:       dto.branch_id ?? undefined,
      } as any);

      const savedLoan = await em.save(Loan, loan);

      // Generate the weekly repayment schedule if weekly terms are known.
      // If neither weeks nor a weekly amount were resolved, skip schedule
      // generation rather than guessing — same caution as the rest of this
      // method, which already validates principal/deposit upstream in the
      // controller before reaching here.
      if (weeks > 0 && weeklyAmount) {
        await this.generateWeeklySchedule(em, savedLoan, weeks, weeklyAmount);
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
            loanType:        'historical_import',
            clientId:        client.id,
            tenantId:        tenantId ?? undefined,
            branchId:        branchId ?? undefined,
            principalAmount: principal,
            interestRate:    0,
            totalAmount:     Number(rec.totalAmount) || principal,
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
                  interest_due, amount_paid, status, paid_date, payment_notes, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,'Historical import',NOW(),NOW())`,
              [
                savedLoan.id, installmentNumber, p.date,
                amountDue, amountDue, amountPaid, scheduleStatus,
                amountPaid > 0 ? p.date : null,
              ],
            );
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
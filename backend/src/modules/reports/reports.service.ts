import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Reconciliation } from '../reconciliation/entities/reconciliation.entity';
import { WeeklySignOff } from './entities/weekly-sign-off.entity';
import { getUserId, RequestUser } from '../../common/helpers/role-helper';
import { subDays, addDays } from 'date-fns';
import { startOfKampalaDay, endOfKampalaDay } from '../../common/utils/kampala-time';
import { buildExcelBuffer, ExcelColumn } from '../../common/utils/excel-export.util';
import { buildSimplePdf } from '../../common/utils/simple-pdf.util';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)        private paymentRepo:  Repository<Payment>,
    @InjectRepository(Loan)           private loanRepo:     Repository<Loan>,
    @InjectRepository(LoanSchedule)   private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(CashDrawer)     private drawerRepo:   Repository<CashDrawer>,
    @InjectRepository(Expense)        private expenseRepo:  Repository<Expense>,
    @InjectRepository(Reconciliation) private reconRepo:    Repository<Reconciliation>,
    @InjectRepository(WeeklySignOff)  private weeklySignOffRepo: Repository<WeeklySignOff>,
  ) {}

  // ── Daily summary ─────────────────────────────────────────────────────────
  async getDailySummary(tenantId: number, date: Date = new Date()) {
    const start = startOfKampalaDay(date);
    const end   = endOfKampalaDay(date);

    const [payments, newLoans] = await Promise.all([
      this.paymentRepo.find({
        where: { tenantId, paymentDate: Between(start, end), status: Not('REVERSED') as any },
      }),
      this.loanRepo.count({ where: { tenantId, createdAt: Between(start, end), status: LoanStatus.ACTIVE } }),
    ]);

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const methodBreakdown = payments.reduce((acc: any, p) => {
      const m = String(p.paymentMethod);
      if (!acc[m]) acc[m] = { count: 0, amount: 0 };
      acc[m].count++;
      acc[m].amount += Number(p.amount);
      return acc;
    }, {});

    return {
      date: start,
      total_collected: Math.round(totalCollected),
      transaction_count: payments.length,
      method_breakdown: methodBreakdown,
      new_loans: newLoans,
    };
  }

  // ── 7-day collection sparkline ────────────────────────────────────────────
  async getWeeklyCollections(tenantId: number) {
    const results = [];
    for (let i = 6; i >= 0; i--) {
      const d     = subDays(new Date(), i);
      const start = startOfKampalaDay(d);
      const end   = endOfKampalaDay(d);
      const rows  = await this.paymentRepo.find({
        where: { tenantId, paymentDate: Between(start, end), status: Not('REVERSED') as any },
      });
      results.push({
        date:  d.toISOString().slice(0, 10),
        total: rows.reduce((s, p) => s + Number(p.amount), 0),
        count: rows.length,
      });
    }
    return results;
  }

  // ── Arrears / overdue report ───────────────────────────────────────────────
  async getArrearsReport(tenantId: number) {
    const rows = await this.loanRepo.manager.query(
      `SELECT
         l.id, l.loan_number, l.balance, l.loan_type, l.loan_product_id,
         COALESCE(lp.name, INITCAP(l.loan_type)) AS product_name,
         COALESCE(lp.code, l.loan_type)          AS product_code,
         c.first_name, c.last_name, c.phone,
         COUNT(ls.id)                            AS overdue_installments,
         SUM(ls.amount_due - ls.amount_paid)     AS total_overdue,
         MIN(ls.due_date)                        AS oldest_overdue_date,
         COALESCE((
           SELECT SUM(ls2.amount_due)
             FROM loan_schedules ls2
            WHERE ls2.loan_id = l.id AND ls2.status IN ('OVERDUE','PENDING')
              AND ls2.due_date <= CURRENT_DATE
         ), 0)                                   AS expected_collections,
         COALESCE((
           SELECT SUM(ls3.amount_paid)
             FROM loan_schedules ls3
            WHERE ls3.loan_id = l.id
         ), 0)                                   AS actual_collected
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
       JOIN clients c ON c.id = l.client_id
       JOIN loan_schedules ls ON ls.loan_id = l.id
        AND ls.status = 'OVERDUE'
       WHERE l.status IN ('ACTIVE','DELINQUENT') AND l.tenant_id = $1
       GROUP BY l.id, l.loan_number, l.balance, l.loan_type, l.loan_product_id,
                lp.name, lp.code, c.first_name, c.last_name, c.phone
       ORDER BY total_overdue DESC`,
      [tenantId],
    );
    return rows.map((r: any) => ({
      loanId:              r.id,
      loanNumber:          r.loan_number,
      clientName:          `${r.first_name} ${r.last_name}`.trim(),
      phone:               r.phone,
      loanType:            r.loan_type,
      loanProductId:       r.loan_product_id ? Number(r.loan_product_id) : null,
      productName:         r.product_name,
      productCode:         r.product_code,
      balance:             Number(r.balance),
      overdueInstallments: Number(r.overdue_installments),
      totalOverdue:        Math.round(Number(r.total_overdue)),
      expectedCollections: Math.round(Number(r.expected_collections)),
      actualCollected:     Math.round(Number(r.actual_collected)),
      oldestOverdueDate:   r.oldest_overdue_date,
      daysOverdue: r.oldest_overdue_date
        ? Math.floor((Date.now() - new Date(r.oldest_overdue_date).getTime()) / 86400000)
        : 0,
    }));
  }

  // ── Portfolio aging (30 / 60 / 90 / 90+ days buckets) ─────────────────────
  async getPortfolioAging(tenantId: number) {
    const rows = await this.loanRepo.manager.query(
      `SELECT bucket, COUNT(*) AS loan_count, COALESCE(SUM(at_risk),0) AS at_risk
       FROM (
         SELECT
           l.id,
           CASE
             WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 30 THEN '1-30 days'
             WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 60 THEN '31-60 days'
             WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 90 THEN '61-90 days'
             ELSE '90+ days'
           END AS bucket,
           SUM(ls.amount_due - ls.amount_paid) AS at_risk
         FROM loans l
         JOIN loan_schedules ls ON ls.loan_id = l.id AND ls.status = 'OVERDUE'
         WHERE l.status IN ('ACTIVE','DELINQUENT') AND l.tenant_id = $1
           AND l.deleted_at IS NULL
         GROUP BY l.id
       ) per_loan
       GROUP BY bucket
       ORDER BY bucket`,
      [tenantId],
    );
    return rows.map((r: any) => ({
      bucket:    r.bucket,
      loanCount: Number(r.loan_count),
      atRisk:    Math.round(Number(r.at_risk)),
    }));
  }

  // ── Portfolio summary ─────────────────────────────────────────────────────
  async getPortfolioSummary(tenantId: number) {
    const [totalRow] = await this.loanRepo.manager.query(
      `SELECT
         COUNT(*)                                            AS total_loans,
         COUNT(*) FILTER (WHERE status='ACTIVE')            AS active,
         COUNT(*) FILTER (WHERE status='PENDING_APPROVAL')  AS pending,
         COUNT(*) FILTER (WHERE status='DELINQUENT')        AS delinquent,
         COUNT(*) FILTER (WHERE status='COMPLETED')         AS completed,
         SUM(principal_amount)                              AS total_principal,
         SUM(balance)                                       AS total_outstanding,
         SUM(balance) FILTER (WHERE status='DELINQUENT')   AS delinquent_balance
       FROM loans
       WHERE deleted_at IS NULL
         AND tenant_id = $1
         AND status != 'CANCELLED'`,
      [tenantId],
    );
    const [payRow] = await this.loanRepo.manager.query(
      `SELECT COALESCE(SUM(amount),0) AS total_collected
         FROM payments WHERE status='COMPLETED' AND tenant_id = $1`,
      [tenantId],
    );
    const [bikeRow] = await this.loanRepo.manager.query(
      `SELECT COUNT(*) FILTER (WHERE status='AVAILABLE') AS available,
              COUNT(*) FILTER (WHERE status='LOANED')    AS loaned,
              COUNT(*) FILTER (WHERE status='SOLD')      AS sold
         FROM bikes WHERE tenant_id = $1`,
      [tenantId],
    );

    return {
      loans: {
        total:      Number(totalRow.total_loans),
        active:     Number(totalRow.active),
        pending:    Number(totalRow.pending),
        delinquent: Number(totalRow.delinquent),
        completed:  Number(totalRow.completed),
      },
      financials: {
        totalPrincipal:     Math.round(Number(totalRow.total_principal || 0)),
        totalOutstanding:   Math.round(Number(totalRow.total_outstanding || 0)),
        totalCollected:     Math.round(Number(payRow.total_collected || 0)),
        delinquentBalance:  Math.round(Number(totalRow.delinquent_balance || 0)),
      },
      bikes: {
        available: Number(bikeRow.available),
        loaned:    Number(bikeRow.loaned),
        sold:      Number(bikeRow.sold),
      },
      byProduct: await this.getPortfolioByProduct(tenantId),
      generatedAt: new Date(),
    };
  }

  // ── Per-product portfolio breakdown (CORRECTED – LATERAL joins) ────────────
  private async getPortfolioByProduct(tenantId: number) {
    const rows: any[] = await this.loanRepo.manager.query(
      `SELECT
         COALESCE(lp.id, NULL)                          AS loan_product_id,
         COALESCE(lp.name, INITCAP(l.loan_type))         AS product_name,
         COALESCE(lp.code, l.loan_type)                  AS product_code,
         COUNT(l.id)                                     AS active_loans,
         COALESCE(SUM(l.balance), 0)                     AS outstanding,
         COALESCE(SUM(l.balance) FILTER (WHERE over.overdue_count > 0), 0)   AS par_amount,
         COUNT(l.id) FILTER (WHERE over.overdue_count > 0)                   AS par_loan_count,
         COALESCE(SUM(today.collected), 0)               AS collected_today
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS overdue_count
         FROM loan_schedules ls
         WHERE ls.loan_id = l.id AND ls.status = 'OVERDUE'
       ) over ON true
       LEFT JOIN LATERAL (
         SELECT SUM(p.amount) AS collected
         FROM payments p
         WHERE p.loan_id = l.id
           AND p.status = 'COMPLETED'
           AND p.payment_date::date = CURRENT_DATE
       ) today ON true
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1 AND l.status IN ('ACTIVE','DELINQUENT')
      GROUP BY COALESCE(lp.id, NULL), COALESCE(lp.name, INITCAP(l.loan_type)), COALESCE(lp.code, l.loan_type)
      ORDER BY product_name`,
      [tenantId],
    );

    return rows.map(r => ({
      loanProductId:  r.loan_product_id ? Number(r.loan_product_id) : null,
      productName:    r.product_name,
      productCode:    r.product_code,
      activeLoans:    Number(r.active_loans),
      outstanding:    Math.round(Number(r.outstanding)),
      par: {
        amount:     Math.round(Number(r.par_amount)),
        loanCount:  Number(r.par_loan_count),
        percentage: Number(r.outstanding) > 0
          ? Math.round((Number(r.par_amount) / Number(r.outstanding)) * 10000) / 100
          : 0,
      },
      collectedToday: Math.round(Number(r.collected_today)),
    }));
  }

  // ── CSV export helpers (unchanged) ────────────────────────────────────────
  async getPaymentsCsv(tenantId: number, startDate?: string, endDate?: string): Promise<string> {
    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end   = endDate   ? new Date(endDate)   : new Date();
    const rows  = await this.paymentRepo.manager.query(
      `SELECT p.receipt_number, p.created_at::date AS date, p.amount,
              p.payment_method, p.status, p.collected_by,
              l.loan_number, l.loan_type,
              c.first_name || ' ' || c.last_name AS client_name, c.phone
         FROM payments p
         JOIN loans l   ON l.id = p.loan_id
         JOIN clients c ON c.id = l.client_id
        WHERE p.created_at BETWEEN $1 AND $2 AND p.tenant_id = $3
        ORDER BY p.created_at DESC`,
      [start, end, tenantId],
    );
    const header = 'Receipt,Date,Amount,Method,Status,Collected By,Loan #,Type,Client,Phone\n';
    const lines  = rows.map((r: any) =>
      [r.receipt_number, r.date, r.amount, r.payment_method, r.status,
       r.collected_by || '', r.loan_number, r.loan_type,
       `"${r.client_name}"`, r.phone].join(',')
    );
    return header + lines.join('\n');
  }

  async getLoansCsv(tenantId: number): Promise<string> {
    const rows = await this.loanRepo.manager.query(
      `SELECT l.loan_number, l.loan_type, l.status, l.principal_amount,
              l.total_amount, l.balance, l.interest_rate, l.term_months,
              l.term_weeks, l.weekly_amount, l.start_date, l.created_at::date AS created,
              c.first_name || ' ' || c.last_name AS client_name, c.phone,
              b.registration_number AS bike_plate
         FROM loans l
         JOIN clients c ON c.id = l.client_id
         LEFT JOIN bikes b ON b.id = l.bike_id
        WHERE l.deleted_at IS NULL AND l.tenant_id = $1
        ORDER BY l.created_at DESC`,
      [tenantId],
    );
    const header = 'Loan #,Type,Status,Principal,Total,Balance,Rate,Months,Weeks,Weekly,Start,Created,Client,Phone,Bike Plate\n';
    const lines  = rows.map((r: any) =>
      [r.loan_number, r.loan_type, r.status, r.principal_amount, r.total_amount,
       r.balance, r.interest_rate, r.term_months, r.term_weeks || '',
       r.weekly_amount || '', r.start_date, r.created,
       `"${r.client_name}"`, r.phone, r.bike_plate || ''].join(',')
    );
    return header + lines.join('\n');
  }

  async getClientsCsv(tenantId: number): Promise<string> {
    const rows = await this.loanRepo.manager.query(
      `SELECT c.id, c.first_name || ' ' || c.last_name AS name, c.phone, c.nin,
              c.occupation, c.monthly_income, c.status, c.verified, c.created_at::date AS joined,
              COUNT(l.id) AS total_loans,
              COUNT(l.id) FILTER (WHERE l.status='ACTIVE') AS active_loans,
              COALESCE(SUM(l.balance) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT')),0) AS outstanding
         FROM clients c
         LEFT JOIN loans l ON l.client_id = c.id AND l.deleted_at IS NULL
        WHERE c.tenant_id = $1
        GROUP BY c.id, c.first_name, c.last_name, c.phone, c.nin,
                 c.occupation, c.monthly_income, c.status, c.verified, c.created_at
        ORDER BY c.created_at DESC`,
      [tenantId],
    );
    const header = 'ID,Name,Phone,NIN,Occupation,Monthly Income,Status,Verified,Joined,Total Loans,Active Loans,Outstanding Balance\n';
    const lines  = rows.map((r: any) =>
      [r.id, `"${r.name}"`, r.phone, r.nin || '', r.occupation || '',
       r.monthly_income, r.status, r.verified, r.joined,
       r.total_loans, r.active_loans, r.outstanding].join(',')
    );
    return header + lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Daily Payment Accountability — every payment recorded on a given day,
  // tenant-wide (optionally one branch), so an admin who was never
  // physically in a branch can see exactly what was collected, by whom,
  // through which drawer, without relying on the branch to self-report it.
  // ═══════════════════════════════════════════════════════════════════════
  async getDailyPaymentAccountability(tenantId: number, date: Date = new Date(), branchId?: number) {
    const start = startOfKampalaDay(date);
    const end   = endOfKampalaDay(date);

    const rows: any[] = await this.paymentRepo.manager.query(
      `SELECT p.id, p.receipt_number, p.payment_date, p.amount, p.payment_method,
              p.status, p.collected_by, p.cash_drawer_id,
              l.loan_number, l.loan_type,
              c.first_name || ' ' || c.last_name AS client_name, c.phone,
              b.name AS branch_name, br.branch_id
         FROM payments p
         JOIN loans l    ON l.id = p.loan_id
         JOIN clients c  ON c.id = l.client_id
         LEFT JOIN cash_drawers br ON br.id = p.cash_drawer_id
         LEFT JOIN branches b      ON b.id = br.branch_id
        WHERE p.tenant_id = $1
          AND p.payment_date BETWEEN $2 AND $3
          ${branchId ? 'AND br.branch_id = $4' : ''}
        ORDER BY p.payment_date ASC`,
      branchId ? [tenantId, start, end, branchId] : [tenantId, start, end],
    );

    const completed = rows.filter(r => r.status !== 'REVERSED');
    const reversed  = rows.filter(r => r.status === 'REVERSED');

    const byMethod: Record<string, { count: number; amount: number }> = {};
    for (const r of completed) {
      const m = r.payment_method || 'UNKNOWN';
      if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
      byMethod[m].count++;
      byMethod[m].amount += Number(r.amount);
    }

    return {
      date: start.toISOString().slice(0, 10),
      branchId: branchId ?? null,
      totalCollected: completed.reduce((s, r) => s + Number(r.amount), 0),
      transactionCount: completed.length,
      reversedCount: reversed.length,
      reversedAmount: reversed.reduce((s, r) => s + Number(r.amount), 0),
      byMethod,
      payments: rows.map(r => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        time: r.payment_date,
        clientName: r.client_name,
        phone: r.phone,
        loanNumber: r.loan_number,
        loanType: r.loan_type,
        amount: Number(r.amount),
        method: r.payment_method,
        status: r.status,
        collectedBy: r.collected_by,
        branchName: r.branch_name || '—',
      })),
    };
  }

  async getDailyPaymentAccountabilityExcel(tenantId: number, date: Date = new Date(), branchId?: number): Promise<Buffer> {
    const report = await this.getDailyPaymentAccountability(tenantId, date, branchId);

    const columns: ExcelColumn[] = [
      { header: 'Time',        key: 'time',       width: 20 },
      { header: 'Receipt #',   key: 'receipt',    width: 16 },
      { header: 'Client',      key: 'client',     width: 24 },
      { header: 'Phone',       key: 'phone',       width: 16 },
      { header: 'Loan #',      key: 'loan',        width: 14 },
      { header: 'Branch',      key: 'branch',      width: 16 },
      { header: 'Method',      key: 'method',      width: 14 },
      { header: 'Collected By',key: 'collectedBy', width: 18 },
      { header: 'Status',      key: 'status',      width: 12 },
      { header: 'Amount (UGX)',key: 'amount',      width: 16, currency: true },
    ];

    const rows = report.payments.map(p => ({
      time: new Date(p.time).toLocaleString('en-UG', { hour12: false }),
      receipt: p.receiptNumber,
      client: p.clientName,
      phone: p.phone,
      loan: p.loanNumber,
      branch: p.branchName,
      method: p.method,
      collectedBy: p.collectedBy || '—',
      status: p.status,
      amount: p.amount,
    }));

    return buildExcelBuffer({
      sheetName: 'Daily Accountability',
      title: `Bingo Vintage — Daily Payment Accountability`,
      subtitle:
        `Business date: ${report.date} (Africa/Kampala) · Scope: ${branchId ? `Branch #${branchId}` : 'All branches'} · ` +
        `Currency: UGX · Reversed payments listed but excluded from total collected · Generated: ${new Date().toISOString()}`,
      columns,
      rows,
      totalsRow: {
        client: `${report.transactionCount} transaction(s)` +
                 (report.reversedCount ? `, ${report.reversedCount} reversed (${report.reversedAmount.toLocaleString()})` : ''),
        amount: report.totalCollected,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Upcoming Due Installments — every loan schedule row due within the
  // next N days (default 7), oldest due date first, so collections staff
  // and admins can see who to follow up with before payments become
  // overdue rather than only after.
  // ═══════════════════════════════════════════════════════════════════════
  async getUpcomingDue(tenantId: number, days = 7, branchId?: number) {
    const today = startOfKampalaDay(new Date());
    const until = addDays(today, days);

    const rows: any[] = await this.scheduleRepo.manager.query(
      `SELECT ls.id, ls.loan_id, ls.installment_number, ls.due_date,
              ls.amount_due, ls.amount_paid, ls.status,
              l.loan_number, l.loan_type, l.branch_id,
              c.first_name || ' ' || c.last_name AS client_name, c.phone,
              b.name AS branch_name
         FROM loan_schedules ls
         JOIN loans l        ON l.id = ls.loan_id
         JOIN clients c      ON c.id = l.client_id
         LEFT JOIN branches b ON b.id = l.branch_id
        WHERE ls.tenant_id = $1
          AND ls.status IN ('PENDING','PARTIAL','OVERDUE')
          AND ls.due_date <= $2
          ${branchId ? 'AND l.branch_id = $3' : ''}
        ORDER BY ls.due_date ASC`,
      branchId ? [tenantId, until, branchId] : [tenantId, until],
    );

    const todayStr = today.toISOString().slice(0, 10);
    const installments = rows.map(r => {
      const dueDateStr = new Date(r.due_date).toISOString().slice(0, 10);
      const daysUntil = Math.round(
        (new Date(dueDateStr).getTime() - new Date(todayStr).getTime()) / 86_400_000,
      );
      return {
        loanNumber: r.loan_number,
        loanType: r.loan_type,
        clientName: r.client_name,
        phone: r.phone,
        branchName: r.branch_name || '—',
        installmentNumber: r.installment_number,
        dueDate: dueDateStr,
        amountDue: Number(r.amount_due) - Number(r.amount_paid || 0),
        status: r.status,
        daysUntilDue: daysUntil, // negative = already overdue
      };
    });

    return {
      generatedFor: todayStr,
      windowDays: days,
      branchId: branchId ?? null,
      count: installments.length,
      totalDue: installments.reduce((s, i) => s + i.amountDue, 0),
      installments,
    };
  }

  async getUpcomingDueExcel(tenantId: number, days = 7, branchId?: number): Promise<Buffer> {
    const report = await this.getUpcomingDue(tenantId, days, branchId);

    const columns: ExcelColumn[] = [
      { header: 'Due Date',    key: 'dueDate',   width: 14 },
      { header: 'Client',      key: 'client',     width: 24 },
      { header: 'Phone',       key: 'phone',       width: 16 },
      { header: 'Loan #',      key: 'loan',        width: 14 },
      { header: 'Branch',      key: 'branch',      width: 16 },
      { header: 'Installment', key: 'installment', width: 12 },
      { header: 'Status',      key: 'status',       width: 12 },
      { header: 'Days',        key: 'daysUntil',    width: 10 },
      { header: 'Amount Due (UGX)', key: 'amountDue', width: 18, currency: true },
    ];

    const rows = report.installments.map(i => ({
      dueDate: i.dueDate,
      client: i.clientName,
      phone: i.phone,
      loan: i.loanNumber,
      branch: i.branchName,
      installment: i.installmentNumber,
      status: i.daysUntilDue < 0 ? 'OVERDUE' : i.status,
      daysUntil: i.daysUntilDue < 0 ? `${Math.abs(i.daysUntilDue)}d overdue` : `in ${i.daysUntilDue}d`,
      amountDue: i.amountDue,
    }));

    return buildExcelBuffer({
      sheetName: 'Upcoming Due',
      title: `Bingo Vintage — Upcoming Due Installments`,
      subtitle: `Window: next ${report.windowDays} days from ${report.generatedFor}` +
             (branchId ? ` (Branch #${branchId})` : ' (All Branches)'),
      columns,
      rows,
      totalsRow: { client: `${report.count} installment(s)`, amountDue: report.totalDue },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Cash Drawer Balancing — per drawer, per day: opening float, cash
  // collected through that drawer, approved expenses paid out of it,
  // the resulting expected balance, what was actually counted at close,
  // the variance, and whether it's been reconciled. This is the report
  // an admin who is never physically in a branch uses to check the real
  // cash position without having to trust a branch's word for it.
  //
  // Expected-cash formula matches ReconciliationService.getExpected()
  // exactly (opening + payments through this drawer − approved expenses),
  // so this report and the in-app reconciliation screen never disagree.
  // ═══════════════════════════════════════════════════════════════════════
  async getDrawerBalancing(tenantId: number, startDate?: string, endDate?: string, branchId?: number) {
    const start = startDate ? startOfKampalaDay(new Date(startDate)) : startOfKampalaDay(subDays(new Date(), 7));
    const end   = endDate   ? endOfKampalaDay(new Date(endDate))     : endOfKampalaDay(new Date());

    const drawers: any[] = await this.drawerRepo.manager.query(
      `SELECT d.id, d.drawer_date, d.status, d.opening_balance, d.closing_balance,
              d.expected_balance, d.difference, d.closed_at,
              b.name AS branch_name, b.id AS branch_id,
              u.username AS opened_by, cu.username AS closed_by,
              r.id AS reconciliation_id, r.actual_cash AS reconciled_actual, r.difference AS reconciled_difference
         FROM cash_drawers d
         LEFT JOIN branches b ON b.id = d.branch_id
         LEFT JOIN users u    ON u.id = d.user_id
         LEFT JOIN users cu   ON cu.id = d.closed_by_id
         LEFT JOIN office_reconciliations r ON r.drawer_id = d.id
        WHERE d.tenant_id = $1
          AND d.drawer_date BETWEEN $2 AND $3
          ${branchId ? 'AND d.branch_id = $4' : ''}
        ORDER BY d.drawer_date DESC, d.id DESC`,
      branchId ? [tenantId, start, end, branchId] : [tenantId, start, end],
    );

    const drawerIds = drawers.map(d => d.id);
    const collectedByDrawer: Record<number, number> = {};
    const expensesByDrawer:  Record<number, number> = {};
    if (drawerIds.length) {
      const payRows: any[] = await this.paymentRepo.manager.query(
        `SELECT cash_drawer_id, COALESCE(SUM(amount),0) AS total
           FROM payments
          WHERE cash_drawer_id = ANY($1) AND status != 'REVERSED'
          GROUP BY cash_drawer_id`,
        [drawerIds],
      );
      payRows.forEach(r => { collectedByDrawer[r.cash_drawer_id] = Number(r.total); });

      const expRows: any[] = await this.expenseRepo.manager.query(
        `SELECT cash_drawer_id, COALESCE(SUM(amount),0) AS total
           FROM expenses
          WHERE cash_drawer_id = ANY($1) AND status = 'approved'
          GROUP BY cash_drawer_id`,
        [drawerIds],
      );
      expRows.forEach(r => { expensesByDrawer[r.cash_drawer_id] = Number(r.total); });
    }

    const items = drawers.map(d => {
      const collected = collectedByDrawer[d.id] || 0;
      const expenses   = expensesByDrawer[d.id]  || 0;
      const opening    = Number(d.opening_balance || 0);
      const expected   = opening + collected - expenses;
      const actual     = d.closing_balance !== null ? Number(d.closing_balance) : null;
      const variance    = actual !== null ? actual - expected : null;
      return {
        drawerId: d.id,
        date: new Date(d.drawer_date).toISOString().slice(0, 10),
        branchName: d.branch_name || '—',
        openedBy: d.opened_by || '—',
        closedBy: d.closed_by || (d.status === 'open' ? '— (still open)' : '—'),
        status: d.reconciliation_id ? 'reconciled' : d.status,
        openingBalance: opening,
        cashCollected: collected,
        expensesPaid: expenses,
        expectedBalance: expected,
        actualBalance: actual,
        variance,
      };
    });

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      branchId: branchId ?? null,
      drawerCount: items.length,
      openDrawers: items.filter(i => i.status === 'open').length,
      totalVariance: items.reduce((s, i) => s + (i.variance || 0), 0),
      drawers: items,
    };
  }

  async getDrawerBalancingExcel(tenantId: number, startDate?: string, endDate?: string, branchId?: number): Promise<Buffer> {
    const report = await this.getDrawerBalancing(tenantId, startDate, endDate, branchId);

    const columns: ExcelColumn[] = [
      { header: 'Date',            key: 'date',      width: 14 },
      { header: 'Branch',          key: 'branch',     width: 16 },
      { header: 'Opened By',       key: 'openedBy',   width: 16 },
      { header: 'Closed By',       key: 'closedBy',   width: 18 },
      { header: 'Status',          key: 'status',      width: 14 },
      { header: 'Opening (UGX)',   key: 'opening',      width: 16, currency: true },
      { header: 'Collected (UGX)', key: 'collected',    width: 16, currency: true },
      { header: 'Expenses (UGX)',  key: 'expenses',      width: 16, currency: true },
      { header: 'Expected (UGX)',  key: 'expected',       width: 16, currency: true },
      { header: 'Actual/Closing (UGX)', key: 'actual',    width: 18, currency: true },
      { header: 'Variance (UGX)',  key: 'variance',        width: 16, currency: true },
    ];

    const rows = report.drawers.map(d => ({
      date: d.date,
      branch: d.branchName,
      openedBy: d.openedBy,
      closedBy: d.closedBy,
      status: d.status,
      opening: d.openingBalance,
      collected: d.cashCollected,
      expenses: d.expensesPaid,
      expected: d.expectedBalance,
      actual: d.actualBalance ?? '(not closed)',
      variance: d.variance ?? '',
    }));

    return buildExcelBuffer({
      sheetName: 'Drawer Balancing',
      title: `Cash Drawer Balancing — ${report.startDate} to ${report.endDate}` +
             (branchId ? ` (Branch #${branchId})` : ' (All Branches)'),
      columns,
      rows,
      totalsRow: {
        branch: `${report.drawerCount} drawer(s), ${report.openDrawers} still open`,
        variance: report.totalVariance,
      },
    });
  }

  // ── NPL / Portfolio Quality ───────────────────────────────────────────────
  /**
   * NPL classification (business decision — default threshold 90 days):
   *   A loan is NPL when status = DEFAULTED OR days_in_arrears >= nplThresholdDays.
   *   days_in_arrears is maintained by ArrearsCalculationJob from OVERDUE/PARTIAL schedules.
   *
   * NPL ratio denominator = total outstanding balance of ACTIVE + DELINQUENT + DEFAULTED
   * NPL ratio numerator   = outstanding balance of NPL loans only.
   *
   * Outstanding uses loans.balance. Overdue uses loans.total_arrears.
   * Do not treat overdue as outstanding principal.
   */
  async getNplReport(tenantId: number, nplThresholdDays = 90, branchId?: number) {
    const threshold = Math.max(1, Math.min(3650, Number(nplThresholdDays) || 90));
    const branchClause = branchId ? 'AND l.branch_id = $3' : '';
    const params: any[] = branchId ? [tenantId, threshold, branchId] : [tenantId, threshold];

    const [summary] = await this.loanRepo.manager.query(
      `SELECT
         COUNT(*) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')) AS active_book_count,
         COALESCE(SUM(l.balance) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')), 0) AS total_outstanding,
         COALESCE(SUM(l.total_arrears) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')), 0) AS total_overdue,
         COUNT(*) FILTER (
           WHERE l.status = 'DEFAULTED'
              OR (l.status IN ('ACTIVE','DELINQUENT') AND COALESCE(l.days_in_arrears,0) >= $2)
         ) AS npl_count,
         COALESCE(SUM(l.balance) FILTER (
           WHERE l.status = 'DEFAULTED'
              OR (l.status IN ('ACTIVE','DELINQUENT') AND COALESCE(l.days_in_arrears,0) >= $2)
         ), 0) AS npl_outstanding,
         COUNT(*) FILTER (
           WHERE l.status IN ('ACTIVE','DELINQUENT')
             AND COALESCE(l.days_in_arrears,0) < $2
         ) AS performing_count,
         COALESCE(SUM(l.balance) FILTER (
           WHERE l.status IN ('ACTIVE','DELINQUENT')
             AND COALESCE(l.days_in_arrears,0) < $2
         ), 0) AS performing_outstanding
       FROM loans l
       WHERE l.deleted_at IS NULL
         AND l.tenant_id = $1
         AND l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')
         ${branchClause}`,
      params,
    );

    const loans = await this.loanRepo.manager.query(
      `SELECT
         l.id, l.loan_number, l.status, l.loan_type,
         l.principal_amount, l.balance, l.total_arrears, l.days_in_arrears,
         l.start_date, l.end_date, l.branch_id,
         c.id AS client_id, c.first_name, c.last_name, c.phone,
         COALESCE(lp.name, INITCAP(l.loan_type)) AS product_name
       FROM loans l
       JOIN clients c ON c.id = l.client_id
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
       WHERE l.deleted_at IS NULL
         AND l.tenant_id = $1
         AND l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')
         AND (
           l.status = 'DEFAULTED'
           OR COALESCE(l.days_in_arrears,0) >= $2
         )
         ${branchClause}
       ORDER BY COALESCE(l.days_in_arrears,0) DESC, l.balance DESC`,
      params,
    );

    const totalOutstanding = Number(summary?.total_outstanding || 0);
    const nplOutstanding = Number(summary?.npl_outstanding || 0);
    const nplRatio = totalOutstanding > 0
      ? Math.round((nplOutstanding / totalOutstanding) * 10000) / 100
      : 0;

    return {
      asOf: new Date().toISOString().slice(0, 10),
      definitions: {
        nplRule:
          `NPL = status DEFAULTED OR days_in_arrears >= ${threshold}. ` +
          `days_in_arrears is maintained by ArrearsCalculationJob from OVERDUE/PARTIAL schedules.`,
        nplThresholdDays: threshold,
        outstandingSource: 'loans.balance',
        overdueSource: 'loans.total_arrears (not the same as balance)',
        ratioDenominator: 'SUM(balance) of ACTIVE + DELINQUENT + DEFAULTED',
        ratioNumerator: 'SUM(balance) of NPL loans only',
        currency: 'UGX',
        note: 'NPL day threshold is a business policy parameter (default 90). Confirm with management if different.',
      },
      summary: {
        activeBookLoans: Number(summary?.active_book_count || 0),
        totalOutstanding: Math.round(totalOutstanding),
        totalOverdueAmount: Math.round(Number(summary?.total_overdue || 0)),
        performingLoans: Number(summary?.performing_count || 0),
        performingOutstanding: Math.round(Number(summary?.performing_outstanding || 0)),
        nplLoans: Number(summary?.npl_count || 0),
        nplOutstanding: Math.round(nplOutstanding),
        nplRatioPercent: nplRatio,
      },
      loans: loans.map((r: any) => ({
        loanId: Number(r.id),
        loanNumber: r.loan_number,
        clientId: Number(r.client_id),
        clientName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        phone: r.phone,
        productName: r.product_name,
        loanType: r.loan_type,
        status: r.status,
        branchId: r.branch_id != null ? Number(r.branch_id) : null,
        startDate: r.start_date,
        // Entity getter disbursement_date maps from startDate when disbursed; column is start_date
        disbursementDate: r.start_date,
        maturityDate: r.end_date,
        originalPrincipal: Math.round(Number(r.principal_amount || 0)),
        outstandingPrincipal: Math.round(Number(r.balance || 0)),
        overdueAmount: Math.round(Number(r.total_arrears || 0)),
        daysOverdue: Number(r.days_in_arrears || 0),
        isNpl: true,
        agingBucket: this.bucketForDays(Number(r.days_in_arrears || 0)),
      })),
    };
  }

  private bucketForDays(days: number): string {
    if (days <= 0) return 'Current';
    if (days <= 30) return '1-30 days';
    if (days <= 60) return '31-60 days';
    if (days <= 90) return '61-90 days';
    if (days <= 180) return '91-180 days';
    return '180+ days';
  }

  /**
   * Enhanced aging: Current, 1-30, 31-60, 61-90, 91-180, 180+.
   * One loan per bucket by loans.days_in_arrears.
   * outstanding = balance; overdueAmount = total_arrears.
   */
  async getPortfolioAgingDetailed(tenantId: number, branchId?: number) {
    const branchClause = branchId ? 'AND l.branch_id = $2' : '';
    const params: any[] = branchId ? [tenantId, branchId] : [tenantId];

    const rows = await this.loanRepo.manager.query(
      `SELECT
         CASE
           WHEN COALESCE(l.days_in_arrears, 0) <= 0 THEN 'Current'
           WHEN l.days_in_arrears BETWEEN 1 AND 30 THEN '1-30 days'
           WHEN l.days_in_arrears BETWEEN 31 AND 60 THEN '31-60 days'
           WHEN l.days_in_arrears BETWEEN 61 AND 90 THEN '61-90 days'
           WHEN l.days_in_arrears BETWEEN 91 AND 180 THEN '91-180 days'
           ELSE '180+ days'
         END AS bucket,
         COUNT(*) AS loan_count,
         COALESCE(SUM(l.balance), 0) AS outstanding,
         COALESCE(SUM(l.total_arrears), 0) AS overdue_amount
       FROM loans l
       WHERE l.deleted_at IS NULL
         AND l.tenant_id = $1
         AND l.status IN ('ACTIVE','DELINQUENT','DEFAULTED')
         ${branchClause}
       GROUP BY 1`,
      params,
    );

    const order = ['Current', '1-30 days', '31-60 days', '61-90 days', '91-180 days', '180+ days'];
    const map = new Map(rows.map((r: any) => [r.bucket, r]));
    const totalOutstanding = rows.reduce((s: number, r: any) => s + Number(r.outstanding || 0), 0);
    const totalLoans = rows.reduce((s: number, r: any) => s + Number(r.loan_count || 0), 0);

    const buckets = order.map((bucket) => {
      const r: any = map.get(bucket) || {};
      const outstanding = Math.round(Number(r.outstanding || 0));
      const loanCount = Number(r.loan_count || 0);
      return {
        bucket,
        loanCount,
        outstanding,
        overdueAmount: Math.round(Number(r.overdue_amount || 0)),
        percentOfPortfolio: totalOutstanding > 0
          ? Math.round((outstanding / totalOutstanding) * 10000) / 100
          : 0,
        percentOfLoans: totalLoans > 0
          ? Math.round((loanCount / totalLoans) * 10000) / 100
          : 0,
      };
    });

    return {
      asOf: new Date().toISOString().slice(0, 10),
      methodology:
        'Loan-level days overdue from loans.days_in_arrears (ArrearsCalculationJob: max overdue days across OVERDUE/PARTIAL schedules). ' +
        'Each loan appears in exactly one bucket. outstanding=loans.balance; overdueAmount=loans.total_arrears.',
      currency: 'UGX',
      totalLoans,
      totalOutstanding: Math.round(totalOutstanding),
      buckets,
    };
  }


  // ── Daily Collection Sheet / Till expected vs collected ─────────────────
  /**
   * For a Kampala business day, lists every installment contractually due that day
   * and matches payments posted that same day (by loan / schedule when available).
   *
   * Expected amount = amount_due - amount_paid on the installment (remaining).
   * Collected amount = sum of non-reversed payments on that day for the loan
   *   (prefer schedule_id match when payment.schedule_id is set).
   *
   * Status per line:
   *   COLLECTED  — collected >= expected (within 1 UGX)
   *   PARTIAL    — 0 < collected < expected
   *   MISSED     — collected = 0 and expected > 0
   *   OVERPAID   — collected > expected
   *
   * This is the cashier daily till expectation sheet: who should pay today,
   * who paid, and who is still outstanding for the day.
   */
  async getDailyCollectionSheet(tenantId: number, date: Date = new Date(), branchId?: number) {
    const start = startOfKampalaDay(date);
    const end   = endOfKampalaDay(date);
    const dayStr = start.toISOString().slice(0, 10);

    const branchClause = branchId ? 'AND l.branch_id = $4' : '';
    const params: any[] = branchId
      ? [tenantId, dayStr, start, end, branchId]
      : [tenantId, dayStr, start, end];
    // fix param indices: $1 tenant, $2 dayStr, $3 start, $4 end, optional $5 branch
    const pDue = branchId
      ? [tenantId, dayStr, branchId]
      : [tenantId, dayStr];
    const branchDue = branchId ? 'AND l.branch_id = $3' : '';

    // Installments contractually due on this calendar day
    const dueRows: any[] = await this.scheduleRepo.manager.query(
      `SELECT ls.id AS schedule_id, ls.loan_id, ls.installment_number,
              ls.due_date, ls.amount_due, ls.amount_paid, ls.status AS schedule_status,
              l.loan_number, l.loan_type, l.branch_id, l.balance AS loan_balance,
              c.id AS client_id,
              c.first_name || ' ' || c.last_name AS client_name,
              c.phone,
              b.name AS branch_name
         FROM loan_schedules ls
         JOIN loans l   ON l.id = ls.loan_id
         JOIN clients c ON c.id = l.client_id
         LEFT JOIN branches b ON b.id = l.branch_id
        WHERE l.tenant_id = $1
          AND l.deleted_at IS NULL
          AND l.status IN ('ACTIVE','DELINQUENT')
          AND ls.due_date::date = $2::date
          AND ls.status IN ('PENDING','PARTIAL','OVERDUE','PAID')
          ${branchDue}
        ORDER BY c.first_name, c.last_name, ls.installment_number`,
      pDue,
    );

    // Payments posted this day (non-reversed), for matching
    const payParams: any[] = branchId ? [tenantId, start, end, branchId] : [tenantId, start, end];
    const branchPay = branchId ? 'AND l.branch_id = $4' : '';
    const payRows: any[] = await this.paymentRepo.manager.query(
      `SELECT p.id, p.loan_id, p.schedule_id, p.amount, p.receipt_number,
              p.payment_method, p.collected_by, p.payment_date, p.cash_drawer_id
         FROM payments p
         JOIN loans l ON l.id = p.loan_id
        WHERE p.tenant_id = $1
          AND p.payment_date BETWEEN $2 AND $3
          AND p.status IS DISTINCT FROM 'REVERSED'
          ${branchPay}`,
      payParams,
    );

    // Index payments by schedule_id and by loan_id
    const bySchedule = new Map<number, any[]>();
    const byLoan = new Map<number, any[]>();
    for (const p of payRows) {
      if (p.schedule_id != null) {
        const sid = Number(p.schedule_id);
        if (!bySchedule.has(sid)) bySchedule.set(sid, []);
        bySchedule.get(sid)!.push(p);
      }
      const lid = Number(p.loan_id);
      if (!byLoan.has(lid)) byLoan.set(lid, []);
      byLoan.get(lid)!.push(p);
    }

    // Track which payment ids already allocated to a due line (avoid double count)
    const usedPaymentIds = new Set<number>();

    const lines = dueRows.map((r) => {
      const scheduleId = Number(r.schedule_id);
      const loanId = Number(r.loan_id);
      const expected = Math.max(0, Number(r.amount_due) - Number(r.amount_paid || 0));

      let matched = (bySchedule.get(scheduleId) || []).filter(p => !usedPaymentIds.has(Number(p.id)));
      if (matched.length === 0) {
        // fallback: payments on this loan today not yet used
        matched = (byLoan.get(loanId) || []).filter(p => !usedPaymentIds.has(Number(p.id)));
      }
      for (const p of matched) usedPaymentIds.add(Number(p.id));

      const collected = matched.reduce((s, p) => s + Number(p.amount), 0);
      let lineStatus: string;
      if (expected <= 0 || (r.schedule_status === 'PAID' && collected >= 0 && expected <= 0)) {
        lineStatus = expected <= 0 && collected === 0 ? 'ALREADY_SETTLED' : 'COLLECTED';
      } else if (collected <= 0) {
        lineStatus = 'MISSED';
      } else if (collected + 0.5 >= expected) {
        lineStatus = 'COLLECTED';
      } else {
        lineStatus = 'PARTIAL';
      }
      if (collected > expected + 0.5 && expected > 0) lineStatus = 'OVERPAID';

      return {
        scheduleId,
        loanId,
        loanNumber: r.loan_number,
        loanType: r.loan_type,
        clientId: Number(r.client_id),
        clientName: r.client_name,
        phone: r.phone,
        branchId: r.branch_id != null ? Number(r.branch_id) : null,
        branchName: r.branch_name || '—',
        installmentNumber: Number(r.installment_number),
        dueDate: dayStr,
        scheduleStatus: r.schedule_status,
        expectedAmount: Math.round(expected),
        collectedAmount: Math.round(collected),
        shortfall: Math.round(Math.max(0, expected - collected)),
        lineStatus,
        loanBalance: Math.round(Number(r.loan_balance || 0)),
        payments: matched.map((p) => ({
          id: Number(p.id),
          amount: Number(p.amount),
          receiptNumber: p.receipt_number,
          method: p.payment_method,
          collectedBy: p.collected_by,
          time: p.payment_date,
          cashDrawerId: p.cash_drawer_id != null ? Number(p.cash_drawer_id) : null,
        })),
      };
    });

    const expectedTotal = lines.reduce((s, l) => s + l.expectedAmount, 0);
    const collectedOnDue = lines.reduce((s, l) => s + l.collectedAmount, 0);
    const missed = lines.filter(l => l.lineStatus === 'MISSED');
    const partial = lines.filter(l => l.lineStatus === 'PARTIAL');
    const collected = lines.filter(l => l.lineStatus === 'COLLECTED' || l.lineStatus === 'OVERPAID');

    // Payments today not matched to a due-today installment (advance / other loan dues)
    const unmatchedPayments = payRows
      .filter(p => !usedPaymentIds.has(Number(p.id)))
      .map(p => ({
        id: Number(p.id),
        loanId: Number(p.loan_id),
        scheduleId: p.schedule_id != null ? Number(p.schedule_id) : null,
        amount: Number(p.amount),
        receiptNumber: p.receipt_number,
        method: p.payment_method,
        collectedBy: p.collected_by,
        time: p.payment_date,
      }));
    const unmatchedTotal = unmatchedPayments.reduce((s, p) => s + p.amount, 0);
    const allPaymentsTotal = payRows.reduce((s, p) => s + Number(p.amount), 0);

    return {
      date: dayStr,
      branchId: branchId ?? null,
      currency: 'UGX',
      definitions: {
        purpose: 'Daily till collection sheet: every client installment due on this day vs payments posted the same day.',
        expected: 'Remaining installment amount (amount_due - amount_paid) where due_date = report date.',
        collected: 'Non-reversed payments with payment_date on report date, matched to schedule_id when set, else to loan.',
        timezone: 'Africa/Kampala business day boundaries',
      },
      summary: {
        dueInstallments: lines.length,
        expectedAmount: Math.round(expectedTotal),
        collectedAgainstDue: Math.round(collectedOnDue),
        shortfallAgainstDue: Math.round(Math.max(0, expectedTotal - collectedOnDue)),
        collectedLines: collected.length,
        partialLines: partial.length,
        missedLines: missed.length,
        collectionRatePercent: expectedTotal > 0
          ? Math.round((collectedOnDue / expectedTotal) * 10000) / 100
          : 0,
        allPaymentsToday: Math.round(allPaymentsTotal),
        paymentsNotOnDueList: Math.round(unmatchedTotal),
        unmatchedPaymentCount: unmatchedPayments.length,
      },
      lines,
      missedClients: missed.map(l => ({
        clientName: l.clientName,
        phone: l.phone,
        loanNumber: l.loanNumber,
        expectedAmount: l.expectedAmount,
        installmentNumber: l.installmentNumber,
      })),
      unmatchedPayments,
    };
  }


  // ── Weekly MD / Manager sign-off pack ───────────────────────────────────
  /**
   * Builds the weekly accountability pack for manager / admin / MD review.
   * weekStart = Monday (YYYY-MM-DD); week is 7 Kampala days [start, start+6].
   */

  async getDailyCollectionSheetExcel(tenantId: number, date: Date = new Date(), branchId?: number): Promise<Buffer> {
    const report = await this.getDailyCollectionSheet(tenantId, date, branchId);
    const columns: ExcelColumn[] = [
      { header: 'Loan #',              key: 'loanNumber',      width: 14 },
      { header: 'Client Name',         key: 'clientName',      width: 24 },
      { header: 'Phone',               key: 'phone',           width: 14 },
      { header: 'Installment #',       key: 'installment',     width: 12 },
      { header: 'Due Date',            key: 'dueDate',         width: 12 },
      { header: 'Expected (UGX)',      key: 'expected',        width: 14, currency: true },
      { header: 'Collected (UGX)',     key: 'collected',       width: 14, currency: true },
      { header: 'Shortfall (UGX)',     key: 'shortfall',       width: 14, currency: true },
      { header: 'Line Status',         key: 'lineStatus',      width: 12 },
      { header: 'Loan Balance (UGX)',  key: 'loanBalance',     width: 16, currency: true },
      { header: 'Receipt(s)',          key: 'receipts',        width: 20 },
      { header: 'Collector(s)',        key: 'collectors',      width: 18 },
      { header: 'Method(s)',           key: 'methods',         width: 14 },
    ];

    const lines = report.lines || [];
    const rows = lines.map((l: any) => ({
      loanNumber: l.loanNumber,
      clientName: l.clientName,
      phone: l.phone,
      installment: l.installmentNumber ?? l.installment,
      dueDate: l.dueDate,
      expected: l.expectedAmount,
      collected: l.collectedAmount,
      shortfall: l.shortfall,
      lineStatus: l.lineStatus,
      loanBalance: l.loanBalance,
      receipts: (l.payments || []).map((p: any) => p.receiptNumber).filter(Boolean).join('; ') || '—',
      collectors: (l.payments || []).map((p: any) => p.collectedBy).filter(Boolean).join('; ') || '—',
      methods: (l.payments || []).map((p: any) => p.method).filter(Boolean).join('; ') || '—',
    }));

    const s = report.summary;
    return buildExcelBuffer({
      sheetName: 'Daily Collection Sheet',
      title: 'Bingo Vintage — Daily Till / Collection Sheet (Financial Reconciliation)',
      subtitle:
        `Business date: ${report.date} (Africa/Kampala) · Currency: UGX · ` +
        `Expected due today vs payments posted that day · Status MISSED/PARTIAL/COLLECTED/OVERPAID · ` +
        `Generated: ${new Date().toISOString()}`,
      columns,
      rows,
      totalsRow: {
        clientName: `Lines: ${lines.length} · Collected on due list: ${s.collectedAgainstDue}`,
        expected: s.expectedAmount,
        collected: s.collectedAgainstDue,
        shortfall: s.shortfallAgainstDue,
      },
    });
  }

    async getWeeklySignOffPack(tenantId: number, weekStartStr: string, branchId?: number) {
    if (!weekStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
      throw new BadRequestException('weekStart is required as YYYY-MM-DD (Monday recommended)');
    }
    const weekStart = startOfKampalaDay(new Date(weekStartStr + 'T12:00:00'));
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    const weekEnd = days[6];
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const startStr = weekStart.toISOString().slice(0, 10);

    const dayRows = [];
    let sumSystemPayments = 0;
    let sumDeclaredActual = 0;
    let sumExpectedDrawer = 0;
    let sumDueExpected = 0;
    let sumDueCollected = 0;
    const exceptions: any[] = [];

    for (const d of days) {
      const dayStr = d.toISOString().slice(0, 10);
      const start = startOfKampalaDay(d);
      const end = endOfKampalaDay(d);

      const payParams: any[] = branchId ? [tenantId, start, end, branchId] : [tenantId, start, end];
      const branchPay = branchId ? 'AND l.branch_id = $4' : '';
      const [payAgg] = await this.paymentRepo.manager.query(
        `SELECT COALESCE(SUM(p.amount),0) AS total, COUNT(*)::int AS cnt
           FROM payments p
           JOIN loans l ON l.id = p.loan_id
          WHERE p.tenant_id = $1
            AND p.payment_date BETWEEN $2 AND $3
            AND p.status IS DISTINCT FROM 'REVERSED'
            ${branchPay}`,
        payParams,
      );

      const drawerParams: any[] = branchId ? [tenantId, dayStr, branchId] : [tenantId, dayStr];
      const branchDr = branchId ? 'AND d.branch_id = $3' : '';
      const drawers: any[] = await this.drawerRepo.manager.query(
        `SELECT d.id, d.status, d.opening_balance, d.expected_balance, d.closing_balance,
                d.difference, d.drawer_date, d.closed_at, d.user_id, d.closed_by_id,
                b.name AS branch_name
           FROM cash_drawers d
           LEFT JOIN branches b ON b.id = d.branch_id
          WHERE d.tenant_id = $1
            AND d.drawer_date::date = $2::date
            ${branchDr}`,
        drawerParams,
      );

      let declaredActual = 0;
      let expectedDrawer = 0;
      let openCount = 0;
      let closedCount = 0;
      let lateCloses = 0;
      for (const dr of drawers) {
        if (dr.status === 'open') openCount++;
        else {
          closedCount++;
          declaredActual += Number(dr.closing_balance ?? 0);
          expectedDrawer += Number(dr.expected_balance ?? 0);
        }
        if (dr.closed_at) {
          const closedDay = new Date(dr.closed_at).toISOString().slice(0, 10);
          const drawerDay = new Date(dr.drawer_date).toISOString().slice(0, 10);
          if (closedDay > drawerDay) {
            lateCloses++;
            exceptions.push({
              type: 'LATE_CLOSE',
              date: dayStr,
              drawerId: dr.id,
              drawerDate: drawerDay,
              closedAt: dr.closed_at,
              message: `Drawer #${dr.id} closed on ${closedDay} for drawer date ${drawerDay}`,
            });
          }
        }
      }

      const systemPayments = Number(payAgg?.total || 0);
      const paymentCount = Number(payAgg?.cnt || 0);

      // Lightweight due vs collected for the day (installments due that date)
      const dueParams: any[] = branchId ? [tenantId, dayStr, branchId] : [tenantId, dayStr];
      const branchDue = branchId ? 'AND l.branch_id = $3' : '';
      const [dueAgg] = await this.scheduleRepo.manager.query(
        `SELECT COALESCE(SUM(GREATEST(ls.amount_due - COALESCE(ls.amount_paid,0), 0)),0) AS expected_due,
                COUNT(*)::int AS due_count
           FROM loan_schedules ls
           JOIN loans l ON l.id = ls.loan_id
          WHERE l.tenant_id = $1
            AND l.deleted_at IS NULL
            AND l.status IN ('ACTIVE','DELINQUENT')
            AND ls.due_date::date = $2::date
            AND ls.status IN ('PENDING','PARTIAL','OVERDUE','PAID')
            ${branchDue}`,
        dueParams,
      );
      const expectedDue = Number(dueAgg?.expected_due || 0);
      const dueCount = Number(dueAgg?.due_count || 0);

      if (paymentCount > 0 && drawers.length === 0) {
        exceptions.push({
          type: 'PAYMENTS_NO_DRAWER',
          date: dayStr,
          message: `${paymentCount} payment(s) totaling ${Math.round(systemPayments)} with no cash drawer for the day`,
        });
      }
      if (openCount > 0) {
        exceptions.push({
          type: 'DRAWER_STILL_OPEN',
          date: dayStr,
          message: `${openCount} drawer(s) still open for ${dayStr}`,
        });
      }
      if (closedCount > 0 && Math.abs(declaredActual - expectedDrawer) > 1) {
        exceptions.push({
          type: 'DRAWER_VARIANCE',
          date: dayStr,
          message: `Declared ${Math.round(declaredActual)} vs expected ${Math.round(expectedDrawer)} (diff ${Math.round(declaredActual - expectedDrawer)})`,
        });
      }

      sumSystemPayments += systemPayments;
      sumDeclaredActual += declaredActual;
      sumExpectedDrawer += expectedDrawer;
      sumDueExpected += expectedDue;

      dayRows.push({
        date: dayStr,
        systemPayments: Math.round(systemPayments),
        paymentCount,
        drawers: drawers.map((dr) => ({
          id: dr.id,
          status: dr.status,
          openingBalance: Number(dr.opening_balance || 0),
          expectedBalance: dr.expected_balance != null ? Number(dr.expected_balance) : null,
          closingBalance: dr.closing_balance != null ? Number(dr.closing_balance) : null,
          difference: dr.difference != null ? Number(dr.difference) : null,
          closedAt: dr.closed_at,
          branchName: dr.branch_name,
        })),
        drawerDeclaredActual: Math.round(declaredActual),
        drawerExpected: Math.round(expectedDrawer),
        drawerVariance: Math.round(declaredActual - expectedDrawer),
        openDrawers: openCount,
        closedDrawers: closedCount,
        lateCloses,
        dueInstallments: dueCount,
        expectedDueAmount: Math.round(expectedDue),
      });
    }

    // Existing sign-off for this week scope
    const existingQ = branchId
      ? { tenantId, branchId, weekStart: startStr, weekEnd: weekEndStr }
      : { tenantId, weekStart: startStr, weekEnd: weekEndStr };
    const existing = await this.weeklySignOffRepo.find({
      where: branchId
        ? { tenantId, branchId, weekStart: startStr as any, weekEnd: weekEndStr as any }
        : { tenantId, weekStart: startStr as any, weekEnd: weekEndStr as any },
      order: { signedAt: 'DESC' },
      take: 5,
    });

    return {
      weekStart: startStr,
      weekEnd: weekEndStr,
      branchId: branchId ?? null,
      currency: 'UGX',
      definitions: {
        purpose: 'Weekly MD/manager pack: system payments vs declared drawer closes, due installments, exceptions.',
        systemPayments: 'SUM of non-reversed payments with payment_date in each Kampala day',
        drawerDeclared: 'SUM of closing_balance on closed drawers for drawer_date',
        drawerExpected: 'SUM of expected_balance computed at close (opening + payments - expenses)',
        roles: 'Sign-off restricted to admin / manager / superadmin (controller Roles guard)',
      },
      totals: {
        systemPayments: Math.round(sumSystemPayments),
        drawerDeclaredActual: Math.round(sumDeclaredActual),
        drawerExpected: Math.round(sumExpectedDrawer),
        drawerVariance: Math.round(sumDeclaredActual - sumExpectedDrawer),
        systemVsDeclared: Math.round(sumSystemPayments - sumDeclaredActual),
        dueExpectedAmount: Math.round(sumDueExpected),
        exceptionCount: exceptions.length,
      },
      days: dayRows,
      exceptions,
      priorSignOffs: existing.map((s) => ({
        id: s.id,
        status: s.status,
        notes: s.notes,
        signedById: s.signedById,
        signedAt: s.signedAt,
        summary: s.summaryJson,
      })),
    };
  }

  async signWeeklyPack(
    tenantId: number,
    user: RequestUser,
    body: { weekStart: string; weekEnd?: string; branchId?: number; notes?: string },
  ) {
    if (!tenantId) throw new ForbiddenException('No tenant assigned');
    const pack = await this.getWeeklySignOffPack(
      tenantId,
      body.weekStart,
      body.branchId,
    );
    const weekEnd = body.weekEnd || pack.weekEnd;

    // Upsert-like: one active sign-off per scope; allow re-sign by inserting new row if unique allows
    // Unique is (tenant, branch, week_start, week_end) — update if exists
    let row = await this.weeklySignOffRepo.findOne({
      where: {
        tenantId,
        branchId: body.branchId ?? null,
        weekStart: pack.weekStart as any,
        weekEnd: weekEnd as any,
      },
    });

    const summaryJson = {
      totals: pack.totals,
      exceptionCount: pack.exceptions.length,
      exceptionTypes: [...new Set(pack.exceptions.map((e) => e.type))],
      signedWeekStart: pack.weekStart,
      signedWeekEnd: pack.weekEnd,
    };

    if (row) {
      row.notes = body.notes ?? row.notes;
      row.summaryJson = summaryJson;
      row.signedById = getUserId(user);
      row.signedAt = new Date();
      row.status = 'SIGNED';
      return this.weeklySignOffRepo.save(row);
    }

    row = this.weeklySignOffRepo.create({
      tenantId,
      branchId: body.branchId ?? null,
      weekStart: pack.weekStart,
      weekEnd: weekEnd,
      status: 'SIGNED',
      notes: body.notes ?? null,
      summaryJson,
      signedById: getUserId(user),
      signedAt: new Date(),
    });
    return this.weeklySignOffRepo.save(row);
  }

  async listWeeklySignOffs(tenantId: number, limit = 20) {
    return this.weeklySignOffRepo.find({
      where: { tenantId },
      order: { weekStart: 'DESC' as any, signedAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }



  // ── Excel exports for all core report types (labelled headers) ───────────

  async getArrearsExcel(tenantId: number): Promise<Buffer> {
    const rows = await this.getArrearsReport(tenantId);
    const columns: ExcelColumn[] = [
      { header: 'Loan #', key: 'loanNumber', width: 14 },
      { header: 'Client Name', key: 'clientName', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Product', key: 'productName', width: 18 },
      { header: 'Loan Type', key: 'loanType', width: 12 },
      { header: 'Balance (UGX)', key: 'balance', width: 14, currency: true },
      { header: 'Overdue Installments', key: 'overdueInstallments', width: 14 },
      { header: 'Total Overdue (UGX)', key: 'totalOverdue', width: 16, currency: true },
      { header: 'Expected Collections (UGX)', key: 'expectedCollections', width: 18, currency: true },
      { header: 'Actual Collected (UGX)', key: 'actualCollected', width: 16, currency: true },
      { header: 'Oldest Overdue Date', key: 'oldestOverdueDate', width: 14 },
      { header: 'Days Overdue', key: 'daysOverdue', width: 12 },
    ];
    const data = rows.map((r) => ({
      ...r,
      oldestOverdueDate: r.oldestOverdueDate
        ? new Date(r.oldestOverdueDate).toISOString().slice(0, 10)
        : '—',
    }));
    const totalOverdue = data.reduce((s, r) => s + Number(r.totalOverdue || 0), 0);
    return buildExcelBuffer({
      sheetName: 'Arrears',
      title: 'Bingo Vintage — Arrears Report',
      subtitle:
        `Currency: UGX · Loans with OVERDUE schedule installments · Tenant-scoped · Generated: ${new Date().toISOString()}`,
      columns,
      rows: data,
      totalsRow: {
        clientName: `${data.length} loan(s)`,
        totalOverdue,
      },
    });
  }

  async getNplExcel(tenantId: number, nplThresholdDays = 90, branchId?: number): Promise<Buffer> {
    const report = await this.getNplReport(tenantId, nplThresholdDays, branchId);
    const columns: ExcelColumn[] = [
      { header: 'Loan #', key: 'loanNumber', width: 14 },
      { header: 'Client Name', key: 'clientName', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Product', key: 'productName', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Principal (UGX)', key: 'principal', width: 14, currency: true },
      { header: 'Balance (UGX)', key: 'balance', width: 14, currency: true },
      { header: 'Arrears (UGX)', key: 'arrears', width: 14, currency: true },
      { header: 'Days in Arrears', key: 'daysOverdue', width: 14 },
      { header: 'Aging Bucket', key: 'agingBucket', width: 14 },
      { header: 'Start Date', key: 'startDate', width: 12 },
    ];
    const loans = (report.loans || []).map((l: any) => ({
      loanNumber: l.loanNumber,
      clientName: l.clientName,
      phone: l.phone,
      productName: l.productName,
      status: l.status,
      principal: l.originalPrincipal ?? l.principalAmount ?? l.principal,
      balance: l.outstandingPrincipal ?? l.balance,
      arrears: l.overdueAmount ?? l.totalArrears ?? l.arrears,
      daysOverdue: l.daysOverdue ?? l.daysInArrears,
      agingBucket: l.agingBucket,
      startDate: l.startDate ? String(l.startDate).slice(0, 10) : '—',
    }));
    const s = report.summary;
    return buildExcelBuffer({
      sheetName: 'NPL',
      title: 'Bingo Vintage — NPL / Portfolio Quality Report',
      subtitle:
        `As of: ${report.asOf} · NPL = DEFAULTED or days_in_arrears ≥ ${report.definitions?.nplThresholdDays ?? nplThresholdDays} · ` +
        `Ratio denominator: ACTIVE+DELINQUENT+DEFAULTED balances · Currency: UGX · Generated: ${new Date().toISOString()}`,
      columns,
      rows: loans,
      totalsRow: {
        clientName: `NPL loans: ${s.nplLoans} · Ratio: ${s.nplRatioPercent}%`,
        balance: s.nplOutstanding,
      },
    });
  }

  async getPortfolioAgingExcel(tenantId: number, branchId?: number): Promise<Buffer> {
    const report = await this.getPortfolioAgingDetailed(tenantId, branchId);
    const columns: ExcelColumn[] = [
      { header: 'Aging Bucket', key: 'bucket', width: 16 },
      { header: 'Loan Count', key: 'loanCount', width: 12 },
      { header: 'Outstanding (UGX)', key: 'outstanding', width: 16, currency: true },
      { header: '% of Portfolio', key: 'percent', width: 14 },
    ];
    const buckets = (report.buckets || []).map((b: any) => ({
      bucket: b.bucket,
      loanCount: b.loanCount ?? b.count,
      outstanding: b.outstanding ?? b.atRisk,
      percent: b.percentOfPortfolio != null ? `${b.percentOfPortfolio}%` : '—',
    }));
    return buildExcelBuffer({
      sheetName: 'Portfolio Aging',
      title: 'Bingo Vintage — Portfolio Aging Report',
      subtitle:
        `As of: ${report.asOf || new Date().toISOString().slice(0, 10)} · Based on loans.days_in_arrears · Currency: UGX · Generated: ${new Date().toISOString()}`,
      columns,
      rows: buckets,
      totalsRow: {
        bucket: 'Total',
        loanCount: report.totalLoans,
        outstanding: report.totalOutstanding,
      },
    });
  }

  async getPortfolioSummaryExcel(tenantId: number): Promise<Buffer> {
    const report = await this.getPortfolioSummary(tenantId);
    const fin = report.financials;
    const loans = report.loans;
    const byProduct = report.byProduct || [];
    const columns: ExcelColumn[] = [
      { header: 'Product / Metric', key: 'name', width: 28 },
      { header: 'Loans', key: 'count', width: 10 },
      { header: 'Principal (UGX)', key: 'principal', width: 16, currency: true },
      { header: 'Outstanding (UGX)', key: 'outstanding', width: 16, currency: true },
    ];
    const rows: any[] = [
      { name: 'ACTIVE loans', count: loans.active, principal: null, outstanding: null },
      { name: 'PENDING_APPROVAL', count: loans.pending, principal: null, outstanding: null },
      { name: 'DELINQUENT', count: loans.delinquent, principal: null, outstanding: fin.delinquentBalance },
      { name: 'COMPLETED', count: loans.completed, principal: null, outstanding: null },
      { name: '— Portfolio totals —', count: loans.total, principal: fin.totalPrincipal, outstanding: fin.totalOutstanding },
      { name: 'Total collected (COMPLETED payments)', count: null, principal: null, outstanding: fin.totalCollected },
    ];
    for (const p of byProduct as any[]) {
      rows.push({
        name: p.productName || 'Product',
        count: p.activeLoans ?? p.loanCount ?? null,
        principal: null,
        outstanding: p.outstanding ?? null,
      });
    }
    return buildExcelBuffer({
      sheetName: 'Portfolio Summary',
      title: 'Bingo Vintage — Portfolio Overview',
      subtitle:
        `Outstanding = SUM(loans.balance) non-cancelled · Collected = SUM(COMPLETED payments) · Currency: UGX · Generated: ${new Date().toISOString()}`,
      columns,
      rows,
    });
  }

  async getWeeklySignOffExcel(tenantId: number, weekStart: string, branchId?: number): Promise<Buffer> {
    const pack = await this.getWeeklySignOffPack(tenantId, weekStart, branchId);
    const columns: ExcelColumn[] = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'System Collections (UGX)', key: 'systemCollected', width: 18, currency: true },
      { header: 'Payment Count', key: 'paymentCount', width: 12 },
      { header: 'Drawer Expected (UGX)', key: 'drawerExpected', width: 16, currency: true },
      { header: 'Drawer Declared (UGX)', key: 'drawerDeclared', width: 16, currency: true },
      { header: 'Drawer Variance (UGX)', key: 'drawerVariance', width: 16, currency: true },
      { header: 'Due Expected (UGX)', key: 'dueExpected', width: 14, currency: true },
      { header: 'Due Collected (UGX)', key: 'dueCollected', width: 14, currency: true },
      { header: 'Open Drawers', key: 'openDrawers', width: 12 },
      { header: 'Closed Drawers', key: 'closedDrawers', width: 12 },
    ];
    const days = (pack.days || []).map((d: any) => ({
      date: d.date,
      systemCollected: d.systemCollected ?? d.collected,
      paymentCount: d.paymentCount ?? d.count,
      drawerExpected: d.drawerExpected ?? d.expectedDrawer,
      drawerDeclared: d.drawerDeclared ?? d.declaredActual,
      drawerVariance: d.drawerVariance ?? d.variance,
      dueExpected: d.expectedDueAmount ?? d.dueExpected,
      dueCollected: d.collectedAgainstDue ?? d.dueCollected,
      openDrawers: d.openCount ?? d.openDrawers,
      closedDrawers: d.closedCount ?? d.closedDrawers,
    }));
    return buildExcelBuffer({
      sheetName: 'Weekly MD Pack',
      title: 'Bingo Vintage — Weekly MD Sign-off Pack',
      subtitle:
        `Week: ${pack.weekStart || weekStart} to ${pack.weekEnd || ''} · Africa/Kampala · System vs declared drawers · Currency: UGX · Generated: ${new Date().toISOString()}`,
      columns,
      rows: days,
    });
  }

  async getPaymentsExcel(tenantId: number, startDate?: string, endDate?: string): Promise<Buffer> {
    const params: any[] = [tenantId];
    let dateClause = '';
    if (startDate) {
      params.push(startDate);
      dateClause += ` AND p.payment_date >= $${params.length}::date`;
    }
    if (endDate) {
      params.push(endDate);
      dateClause += ` AND p.payment_date < ($${params.length}::date + interval '1 day')`;
    }
    const rows = await this.paymentRepo.manager.query(
      `SELECT p.receipt_number, p.payment_date, p.amount, p.payment_method, p.status,
              p.collected_by, l.loan_number, c.first_name, c.last_name, c.phone
         FROM payments p
         JOIN loans l ON l.id = p.loan_id
         JOIN clients c ON c.id = l.client_id
        WHERE p.tenant_id = $1 ${dateClause}
        ORDER BY p.payment_date DESC
        LIMIT 10000`,
      params,
    );
    const columns: ExcelColumn[] = [
      { header: 'Receipt #', key: 'receipt', width: 16 },
      { header: 'Payment Date/Time', key: 'time', width: 20 },
      { header: 'Client Name', key: 'client', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Loan #', key: 'loan', width: 14 },
      { header: 'Method', key: 'method', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Collected By', key: 'collectedBy', width: 16 },
      { header: 'Amount (UGX)', key: 'amount', width: 14, currency: true },
    ];
    const data = rows.map((r: any) => ({
      receipt: r.receipt_number,
      time: r.payment_date ? new Date(r.payment_date).toLocaleString('en-UG', { hour12: false }) : '',
      client: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      phone: r.phone,
      loan: r.loan_number,
      method: r.payment_method,
      status: r.status,
      collectedBy: r.collected_by || '—',
      amount: Number(r.amount),
    }));
    const total = data.filter((d) => d.status !== 'REVERSED').reduce((s, d) => s + d.amount, 0);
    return buildExcelBuffer({
      sheetName: 'Payments',
      title: 'Bingo Vintage — Payments Export',
      subtitle:
        `Range: ${startDate || 'all'} to ${endDate || 'all'} · Currency: UGX · Totals exclude REVERSED · Generated: ${new Date().toISOString()}`,
      columns,
      rows: data,
      totalsRow: { client: `${data.length} row(s)`, amount: total },
    });
  }

  async getLoansExcel(tenantId: number): Promise<Buffer> {
    const rows = await this.loanRepo.manager.query(
      `SELECT l.loan_number, l.loan_type, l.status, l.principal_amount, l.total_amount, l.balance,
              l.interest_rate, l.term_months, l.start_date, c.first_name, c.last_name, c.phone
         FROM loans l
         JOIN clients c ON c.id = l.client_id
        WHERE l.tenant_id = $1 AND l.deleted_at IS NULL
        ORDER BY l.id DESC
        LIMIT 10000`,
      [tenantId],
    );
    const columns: ExcelColumn[] = [
      { header: 'Loan #', key: 'loanNumber', width: 14 },
      { header: 'Client Name', key: 'client', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Principal (UGX)', key: 'principal', width: 14, currency: true },
      { header: 'Total Amount (UGX)', key: 'total', width: 14, currency: true },
      { header: 'Balance (UGX)', key: 'balance', width: 14, currency: true },
      { header: 'Interest Rate %', key: 'rate', width: 12 },
      { header: 'Term (months)', key: 'term', width: 12 },
      { header: 'Start Date', key: 'start', width: 12 },
    ];
    const data = rows.map((r: any) => ({
      loanNumber: r.loan_number,
      client: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      phone: r.phone,
      type: r.loan_type,
      status: r.status,
      principal: Number(r.principal_amount),
      total: Number(r.total_amount),
      balance: Number(r.balance),
      rate: Number(r.interest_rate),
      term: r.term_months,
      start: r.start_date ? String(r.start_date).slice(0, 10) : '',
    }));
    return buildExcelBuffer({
      sheetName: 'Loans',
      title: 'Bingo Vintage — Loans Export',
      subtitle: `Currency: UGX · Balance = remaining principal · Generated: ${new Date().toISOString()}`,
      columns,
      rows: data,
    });
  }

  async getClientsExcel(tenantId: number): Promise<Buffer> {
    const rows = await this.loanRepo.manager.query(
      `SELECT c.id, c.first_name, c.last_name, c.phone, c.nin, c.status, c.monthly_income, c.created_at,
              COUNT(l.id)::int AS loan_count,
              COUNT(l.id) FILTER (WHERE l.status = 'ACTIVE')::int AS active_loans,
              COALESCE(SUM(l.balance) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT')),0) AS outstanding
         FROM clients c
         LEFT JOIN loans l ON l.client_id = c.id AND l.deleted_at IS NULL
        WHERE c.tenant_id = $1
        GROUP BY c.id
        ORDER BY c.id DESC
        LIMIT 10000`,
      [tenantId],
    );
    const columns: ExcelColumn[] = [
      { header: 'Client ID', key: 'id', width: 10 },
      { header: 'Full Name', key: 'name', width: 24 },
      { header: 'Phone', key: 'phone', width: 14 },
      { header: 'NIN', key: 'nin', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Monthly Income (UGX)', key: 'income', width: 16, currency: true },
      { header: 'Total Loans', key: 'loans', width: 12 },
      { header: 'Active Loans', key: 'active', width: 12 },
      { header: 'Outstanding (UGX)', key: 'outstanding', width: 14, currency: true },
      { header: 'Joined', key: 'joined', width: 12 },
    ];
    const data = rows.map((r: any) => ({
      id: r.id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      phone: r.phone,
      nin: r.nin || '—',
      status: r.status,
      income: Number(r.monthly_income || 0),
      loans: r.loan_count,
      active: r.active_loans,
      outstanding: Number(r.outstanding),
      joined: r.created_at ? String(r.created_at).slice(0, 10) : '',
    }));
    return buildExcelBuffer({
      sheetName: 'Clients',
      title: 'Bingo Vintage — Clients Export',
      subtitle: `Currency: UGX · Outstanding = active/delinquent loan balances · Generated: ${new Date().toISOString()}`,
      columns,
      rows: data,
    });
  }

  async getNplPdf(tenantId: number, nplThresholdDays = 90, branchId?: number): Promise<Buffer> {
    const report = await this.getNplReport(tenantId, nplThresholdDays, branchId);
    const lines: string[] = [];
    lines.push(`As of: ${report.asOf}`);
    lines.push(`NPL threshold (days): ${report.definitions.nplThresholdDays}`);
    lines.push(report.definitions.nplRule);
    lines.push('');
    const s = report.summary;
    lines.push(`Active book loans: ${s.activeBookLoans}`);
    lines.push(`Total outstanding: ${s.totalOutstanding}`);
    lines.push(`Total overdue amount: ${s.totalOverdueAmount}`);
    lines.push(`Performing loans: ${s.performingLoans} | outstanding: ${s.performingOutstanding}`);
    lines.push(`NPL loans: ${s.nplLoans} | outstanding: ${s.nplOutstanding}`);
    lines.push(`NPL ratio: ${s.nplRatioPercent}%`);
    lines.push('');
    lines.push('Loan | Client | Days OD | Outstanding | Overdue | Status');
    for (const row of report.loans.slice(0, 200)) {
      lines.push(
        `${row.loanNumber} | ${row.clientName} | ${row.daysOverdue} | ${row.outstandingPrincipal} | ${row.overdueAmount} | ${row.status}`,
      );
    }
    if (report.loans.length > 200) lines.push(`... and ${report.loans.length - 200} more`);
    return buildSimplePdf('Bingo Vintage — NPL / Portfolio Quality', lines);
  }

  async getWeeklySignOffPdf(tenantId: number, weekStart: string, branchId?: number): Promise<Buffer> {
    const pack = await this.getWeeklySignOffPack(tenantId, weekStart, branchId);
    const lines: string[] = [];
    lines.push(`Week: ${pack.weekStart} to ${pack.weekEnd}`);
    lines.push(`System payments: ${pack.totals.systemPayments}`);
    lines.push(`Drawer declared: ${pack.totals.drawerDeclaredActual}`);
    lines.push(`Drawer expected: ${pack.totals.drawerExpected}`);
    lines.push(`System vs declared: ${pack.totals.systemVsDeclared}`);
    lines.push(`Exceptions: ${pack.totals.exceptionCount}`);
    lines.push('');
    lines.push('Date | System | Declared | Expected | Variance | Open/Closed | Late');
    for (const d of pack.days) {
      lines.push(
        `${d.date} | ${d.systemPayments} | ${d.drawerDeclaredActual} | ${d.drawerExpected} | ${d.drawerVariance} | ${d.openDrawers}/${d.closedDrawers} | ${d.lateCloses}`,
      );
    }
    lines.push('');
    lines.push('Exceptions:');
    for (const ex of pack.exceptions) {
      lines.push(`${ex.type} | ${ex.date} | ${ex.message}`);
    }
    return buildSimplePdf('Bingo Vintage — Weekly MD Sign-off Pack', lines);
  }

}

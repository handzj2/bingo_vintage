import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Reconciliation } from '../reconciliation/entities/reconciliation.entity';
import { subDays, addDays } from 'date-fns';
import { startOfKampalaDay, endOfKampalaDay } from '../../common/utils/kampala-time';
import { buildExcelBuffer, ExcelColumn } from '../../common/utils/excel-export.util';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)        private paymentRepo:  Repository<Payment>,
    @InjectRepository(Loan)           private loanRepo:     Repository<Loan>,
    @InjectRepository(LoanSchedule)   private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(CashDrawer)     private drawerRepo:   Repository<CashDrawer>,
    @InjectRepository(Expense)        private expenseRepo:  Repository<Expense>,
    @InjectRepository(Reconciliation) private reconRepo:    Repository<Reconciliation>,
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
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.loanRepo.manager.query(
      `SELECT
         CASE
           WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 30  THEN '1-30 days'
           WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 60  THEN '31-60 days'
           WHEN (CURRENT_DATE - MIN(ls.due_date)) <= 90  THEN '61-90 days'
           ELSE '90+ days'
         END AS bucket,
         COUNT(DISTINCT l.id)               AS loan_count,
         SUM(ls.amount_due - ls.amount_paid) AS at_risk
       FROM loans l
       JOIN loan_schedules ls ON ls.loan_id = l.id AND ls.status = 'OVERDUE'
       WHERE l.status IN ('ACTIVE','DELINQUENT') AND l.tenant_id = $1
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
      title: `Daily Payment Accountability — ${report.date}${branchId ? ` (Branch #${branchId})` : ' (All Branches)'}`,
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
      title: `Upcoming Due Installments — next ${report.windowDays} days from ${report.generatedFor}` +
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
}
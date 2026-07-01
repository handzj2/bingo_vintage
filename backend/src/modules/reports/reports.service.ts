import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { subDays } from 'date-fns';
import { startOfKampalaDay, endOfKampalaDay } from '../../common/utils/kampala-time';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment)      private paymentRepo:  Repository<Payment>,
    @InjectRepository(Loan)         private loanRepo:     Repository<Loan>,
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
  ) {}

  // ── Daily summary ─────────────────────────────────────────────────────────
  async getDailySummary(tenantId: number, date: Date = new Date()) {
    // See common/utils/kampala-time.ts — date-fns's startOfDay/endOfDay use
    // the server's local timezone (UTC on Railway), not Kampala's.
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
         -- Expected collections: all installments due-or-overdue for this
         -- loan, not just the OVERDUE-status ones already joined above —
         -- a separate subquery since it needs a different status filter
         -- than the main join.
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
      // Phase 5.1: per-product breakdown. Groups by loan_product_id when
      // present (the genuinely product-driven path); falls back to
      // loan_type for legacy loans that predate this feature — every loan
      // currently in the system, since loan_product_id only started being
      // populated this milestone. New products appear here automatically
      // the moment a tenant has a loan of that product, with no code
      // change required.
      byProduct: await this.getPortfolioByProduct(tenantId),
      generatedAt: new Date(),
    };
  }

  // ── Per-product portfolio breakdown ───────────────────────────────────────
  private async getPortfolioByProduct(tenantId: number) {
    const rows: any[] = await this.loanRepo.manager.query(
      `SELECT
         COALESCE(lp.id, NULL)                          AS loan_product_id,
         COALESCE(lp.name, INITCAP(l.loan_type))         AS product_name,
         COALESCE(lp.code, l.loan_type)                  AS product_code,
         COUNT(l.id)                                     AS active_loans,
         COALESCE(SUM(l.balance), 0)                     AS outstanding,
         COALESCE(SUM(l.balance) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM loan_schedules ls
              WHERE ls.loan_id = l.id AND ls.status = 'OVERDUE'
           )
         ), 0)                                           AS par_amount,
         COUNT(l.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM loan_schedules ls
              WHERE ls.loan_id = l.id AND ls.status = 'OVERDUE'
           )
         )                                                AS par_loan_count,
         COALESCE((
           SELECT SUM(p.amount) FROM payments p
            WHERE p.loan_id = l.id AND p.status = 'COMPLETED'
              AND p.payment_date >= CURRENT_DATE
         ), 0)                                            AS collected_today
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1 AND l.status IN ('ACTIVE','DELINQUENT')
      GROUP BY COALESCE(lp.id, NULL), COALESCE(lp.name, INITCAP(l.loan_type)), COALESCE(lp.code, l.loan_type)
      ORDER BY product_name`,
      [tenantId],
    );

    // collected_today is computed per-loan via a correlated subquery
    // (payments is a different table than loans, so it can't be reached by
    // a simple FILTER on the grouped rows the way par_amount/outstanding
    // are) — each loan's figure is computed once, then summed normally by
    // the outer GROUP BY. Same query shape already used safely elsewhere
    // in this file (getDailySummary).
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

  // ── CSV export helpers ────────────────────────────────────────────────────
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
}
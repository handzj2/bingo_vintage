import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
  ) {}

  async getSummary(tenantId: number, startDate?: Date, endDate?: Date) {
    const paymentQuery = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.status = :status', { status: PaymentStatus.COMPLETED });

    const expenseQuery = this.expenseRepo
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.status = :status', { status: 'approved' });

    if (startDate && endDate) {
      paymentQuery.andWhere('p.created_at BETWEEN :start AND :end', { start: startDate, end: endDate });
      expenseQuery.andWhere('e.created_at BETWEEN :start AND :end', { start: startDate, end: endDate });
    }

    const [payments, expenses] = await Promise.all([
      paymentQuery.select('SUM(p.amount)', 'total').getRawOne(),
      expenseQuery.select('SUM(e.amount)', 'total').getRawOne(),
    ]);

    const totalPayments = Number(payments?.total || 0);
    const totalExpenses = Number(expenses?.total || 0);

    return {
      totalPayments,
      totalExpenses,
      netCash: totalPayments - totalExpenses,
    };
  }

  // ── Phase 5.3: product-level KPIs (CORRECTED – LATERAL joins) ───────────
  async getProductKpis(tenantId: number) {
    // Main KPIs with accurate collected_today using LATERAL
    const rows: any[] = await this.paymentRepo.manager.query(
      `SELECT
         COALESCE(lp.id, NULL)                   AS loan_product_id,
         COALESCE(lp.name, INITCAP(l.loan_type))  AS product_name,
         COALESCE(lp.code, l.loan_type)           AS product_code,
         COUNT(l.id) FILTER (WHERE l.status = 'ACTIVE')       AS active_loans,
         COALESCE(SUM(l.balance) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT')), 0) AS outstanding,
         COUNT(l.id) FILTER (WHERE l.status = 'PENDING_APPROVAL') AS pending_disbursement,
         COALESCE(SUM(l.principal_amount) FILTER (WHERE l.status = 'ACTIVE' AND l.created_at >= CURRENT_DATE), 0) AS disbursed_today,
         COALESCE(SUM(today.collected), 0)       AS collected_today_per_loan
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
       LEFT JOIN LATERAL (
         SELECT SUM(p.amount) AS collected
         FROM payments p
         WHERE p.loan_id = l.id
           AND p.status = 'COMPLETED'
           AND p.payment_date::date = CURRENT_DATE
       ) today ON true
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1
      GROUP BY COALESCE(lp.id, NULL), COALESCE(lp.name, INITCAP(l.loan_type)), COALESCE(lp.code, l.loan_type)
      ORDER BY product_name`,
      [tenantId],
    );

    // PAR per product (unchanged, separate query is fine)
    const parRows: any[] = await this.paymentRepo.manager.query(
      `SELECT
         COALESCE(lp.id, NULL) AS loan_product_id,
         COALESCE(SUM(l.balance), 0) AS par_amount
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1 AND l.status IN ('ACTIVE','DELINQUENT')
        AND EXISTS (SELECT 1 FROM loan_schedules ls WHERE ls.loan_id = l.id AND ls.status = 'OVERDUE')
      GROUP BY COALESCE(lp.id, NULL)`,
      [tenantId],
    );
    const parByProductId = new Map<number | null, number>();
    for (const r of parRows) {
      parByProductId.set(r.loan_product_id ? Number(r.loan_product_id) : null, Math.round(Number(r.par_amount)));
    }

    return rows.map(r => {
      const productKey = r.loan_product_id ? Number(r.loan_product_id) : null;
      return {
        loanProductId:      productKey,
        productName:        r.product_name,
        productCode:        r.product_code,
        activeLoans:        Number(r.active_loans),
        outstanding:        Math.round(Number(r.outstanding)),
        pendingDisbursement: Number(r.pending_disbursement),
        disbursedToday:     Math.round(Number(r.disbursed_today)),
        collectedToday:     Math.round(Number(r.collected_today_per_loan)),
        par:                parByProductId.get(productKey) ?? 0,
      };
    });
  }

  /**
   * Pending-work summary for notification centre + sidebar badges.
   * Tenant-scoped. Optional branch filter for branch-scoped roles.
   * Returns counts + lightweight item lists for each approval queue.
   */
  async getPendingWork(tenantId: number, branchId?: number | null, permissions?: Set<string> | string[]) {
    if (!tenantId) {
      return {
        loans: { count: 0, items: [] },
        expenses: { count: 0, items: [] },
        reversals: { count: 0, items: [] },
        total: 0,
      };
    }

    const permSet = permissions instanceof Set
      ? permissions
      : new Set(Array.isArray(permissions) ? permissions : []);

    const canLoan = permSet.has('loan.approve') || permSet.size === 0; // empty = caller already authorised
    const canExpense = permSet.has('expense.approve') || permSet.size === 0;
    const canReversal = permSet.has('payment.reverse') || permSet.has('payment.reversal.approve') || permSet.size === 0;

    const branchClause = branchId ? 'AND branch_id = $2' : '';
    const params: any[] = branchId ? [tenantId, branchId] : [tenantId];

    let loans = { count: 0, items: [] as any[] };
    let expenses = { count: 0, items: [] as any[] };
    let reversals = { count: 0, items: [] as any[] };

    if (canLoan) {
      const loanRows = await this.paymentRepo.manager.query(
        `SELECT l.id, l.loan_number AS reference, l.principal_amount AS amount,
                l.branch_id, l.created_at AS submitted_at, l.status,
                u.full_name AS submitted_by, u.username AS submitted_by_username,
                c.full_name AS client_name
           FROM loans l
           LEFT JOIN users u ON u.id = l.created_by_id
           LEFT JOIN clients c ON c.id = l.client_id
          WHERE l.tenant_id = $1
            AND l.status IN ('PENDING_APPROVAL', 'PENDING')
            ${branchClause}
          ORDER BY l.created_at ASC
          LIMIT 20`,
        params,
      );
      loans = {
        count: loanRows.length,
        items: loanRows.map((r: any) => ({
          id: r.id,
          type: 'loan',
          reference: r.reference || `LOAN-${r.id}`,
          amount: Number(r.amount),
          branchId: r.branch_id,
          submittedAt: r.submitted_at,
          status: r.status,
          submittedBy: r.submitted_by || r.submitted_by_username || '—',
          clientName: r.client_name,
          href: `/dashboard/loans/${r.id}`,
        })),
      };
      // Accurate count (not limited)
      const [{ cnt }] = await this.paymentRepo.manager.query(
        `SELECT COUNT(*)::int AS cnt FROM loans
          WHERE tenant_id = $1 AND status IN ('PENDING_APPROVAL','PENDING') ${branchClause}`,
        params,
      );
      loans.count = cnt;
    }

    if (canExpense) {
      const expRows = await this.paymentRepo.manager.query(
        `SELECT e.id, e.amount, e.branch_id, e.created_at AS submitted_at, e.status,
                e.description, u.full_name AS submitted_by, u.username AS submitted_by_username
           FROM expenses e
           LEFT JOIN users u ON u.id = e.created_by_id
          WHERE e.tenant_id = $1
            AND e.status = 'pending'
            ${branchClause}
          ORDER BY e.created_at ASC
          LIMIT 20`,
        params,
      );
      const [{ cnt }] = await this.paymentRepo.manager.query(
        `SELECT COUNT(*)::int AS cnt FROM expenses
          WHERE tenant_id = $1 AND status = 'pending' ${branchClause}`,
        params,
      );
      expenses = {
        count: cnt,
        items: expRows.map((r: any) => ({
          id: r.id,
          type: 'expense',
          reference: `EXP-${r.id}`,
          amount: Number(r.amount),
          branchId: r.branch_id,
          submittedAt: r.submitted_at,
          status: r.status,
          submittedBy: r.submitted_by || r.submitted_by_username || '—',
          description: r.description,
          href: `/dashboard/expenses/approval`,
        })),
      };
    }

    if (canReversal) {
      // Reversals pending approval (uses reversal_status column from earlier migration)
      try {
        const revRows = await this.paymentRepo.manager.query(
          `SELECT p.id, p.amount, p.branch_id, p.created_at AS submitted_at,
                  p.reversal_status AS status, p.receipt_number AS reference,
                  u.full_name AS submitted_by, u.username AS submitted_by_username
             FROM payments p
             LEFT JOIN users u ON u.id = p.created_by_id
            WHERE p.tenant_id = $1
              AND p.reversal_status = 'PENDING'
              ${branchClause}
            ORDER BY p.created_at ASC
            LIMIT 20`,
          params,
        );
        const [{ cnt }] = await this.paymentRepo.manager.query(
          `SELECT COUNT(*)::int AS cnt FROM payments
            WHERE tenant_id = $1 AND reversal_status = 'PENDING' ${branchClause}`,
          params,
        );
        reversals = {
          count: cnt,
          items: revRows.map((r: any) => ({
            id: r.id,
            type: 'reversal',
            reference: r.reference || `PAY-${r.id}`,
            amount: Number(r.amount),
            branchId: r.branch_id,
            submittedAt: r.submitted_at,
            status: r.status,
            submittedBy: r.submitted_by || r.submitted_by_username || '—',
            href: `/dashboard/reversals`,
          })),
        };
      } catch {
        // Column may not exist on very old DBs — leave empty
      }
    }


    // Pending loan corrections (dual-control queue)
    let corrections = { count: 0, items: [] as any[] };
    const canApproveCorrection = permSet.has('loan.approve_correction') || permSet.size === 0;
    if (canApproveCorrection) {
      try {
        const corrRows = await this.paymentRepo.manager.query(
          `SELECT c.id, c.loan_id, c.correction_type, c.reason, c.created_at AS submitted_at,
                  c.status, u.full_name AS submitted_by, u.username AS submitted_by_username,
                  l.loan_number AS reference
             FROM loan_corrections c
             LEFT JOIN users u ON u.id = c.requested_by_id
             LEFT JOIN loans l ON l.id = c.loan_id
            WHERE c.tenant_id = $1 AND c.status = 'PENDING'
            ORDER BY c.created_at ASC LIMIT 20`,
          [tenantId],
        );
        const [{ cnt }] = await this.paymentRepo.manager.query(
          `SELECT COUNT(*)::int AS cnt FROM loan_corrections WHERE tenant_id = $1 AND status = 'PENDING'`,
          [tenantId],
        );
        corrections = {
          count: cnt,
          items: corrRows.map((r: any) => ({
            id: r.id,
            type: 'correction',
            reference: r.reference || `CORR-${r.id}`,
            submittedAt: r.submitted_at,
            status: r.status,
            submittedBy: r.submitted_by || r.submitted_by_username || '—',
            description: `${r.correction_type}: ${r.reason || ''}`.slice(0, 120),
            href: `/dashboard/loans/${r.loan_id}`,
          })),
        };
      } catch { /* table may not exist yet */ }
    }

    let overdueDrawers = { count: 0, items: [] as any[] };
    const canDrawer = permSet.has('drawer.force_close') || permSet.has('drawer.view') || permSet.size === 0;
    if (canDrawer) {
      try {
        const drRows = await this.paymentRepo.manager.query(
          `SELECT d.id, d.branch_id, d.drawer_date, d.status, u.full_name AS opened_by
             FROM cash_drawers d
             LEFT JOIN users u ON u.id = d.user_id
            WHERE d.tenant_id = $1 AND d.status = 'open'
              AND d.drawer_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kampala')::date
            ORDER BY d.drawer_date ASC LIMIT 20`,
          [tenantId],
        );
        overdueDrawers = {
          count: drRows.length,
          items: drRows.map((r: any) => ({
            id: r.id,
            type: 'overdue_drawer',
            reference: `DRW-${r.id}`,
            branchId: r.branch_id,
            submittedAt: r.drawer_date,
            status: 'overdue',
            submittedBy: r.opened_by || '—',
            description: `Open since ${r.drawer_date} — requires force-close`,
            href: `/dashboard/finance/drawers`,
          })),
        };
      } catch { /* ignore */ }
    }

    return {
      loans,
      expenses,
      reversals,
      corrections,
      overdueDrawers,
      total:
        loans.count +
        expenses.count +
        reversals.count +
        corrections.count +
        overdueDrawers.count,
      generatedAt: new Date().toISOString(),
    };
  }
}

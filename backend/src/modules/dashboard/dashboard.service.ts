import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { classifyDbError, newQueueErrorReference, toQueueError, QueueError } from './queue-error.util';

export type QueueName = 'loans' | 'expenses' | 'reversals' | 'corrections' | 'overdueDrawers';
export type QueueResult = { count: number; items: any[]; error?: QueueError };
const QUEUE_LABELS: Record<QueueName, string> = {
  loans: 'loan approvals',
  expenses: 'expense approvals',
  reversals: 'payment reversals',
  corrections: 'loan corrections',
  overdueDrawers: 'overdue drawers',
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
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
        AND EXISTS (SELECT 1 FROM loan_schedules ls WHERE ls.loan_id = l.id AND ls.status = 'OVERDUE' AND COALESCE(ls.is_active, true) = true)
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
   *
   * Failure model: every queue is loaded independently. If a queue's query fails, that queue is
   * returned with `error` set (and count 0 / no items) — callers MUST check `error` before treating
   * the queue as empty. The failure is logged with a reference id. If every enabled queue fails the
   * endpoint answers 503 instead of a misleading "all clear".
   */
  async getPendingWork(
    tenantId: number,
    branchId: number | null | undefined,
    caps: { loan: boolean; expense: boolean; reversal: boolean; correction: boolean; drawer: boolean },
    opts: { includeDiagnostics?: boolean } = {},
  ) {
    if (!tenantId) {
      return {
        loans: { count: 0, items: [] }, expenses: { count: 0, items: [] },
        reversals: { count: 0, items: [] }, corrections: { count: 0, items: [] },
        overdueDrawers: { count: 0, items: [] }, total: 0,
        status: 'ok' as const, failedQueues: [] as QueueName[],
      };
    }

    // Capabilities are decided by the controller with hasPermission() (admins always pass).
    // Qualified per table below: users/clients also have branch_id, so an unqualified
    // column made every branch-scoped query fail with "ambiguous column".
    const branchOn = (alias: string) => (branchId ? `AND ${alias}.branch_id = $2` : '');
    const params: any[] = branchId ? [tenantId, branchId] : [tenantId];
    const ctx = { tenantId, branchId: branchId ?? null, includeDiagnostics: !!opts.includeDiagnostics };

    const empty = (): QueueResult => ({ count: 0, items: [] });
    const failedQueues: QueueName[] = [];
    let attempted = 0;

    const run = async (name: QueueName, enabled: boolean, load: () => Promise<QueueResult>): Promise<QueueResult> => {
      if (!enabled) return empty();
      attempted++;
      try {
        return await load();
      } catch (e: any) {
        failedQueues.push(name);
        return { count: 0, items: [], error: this.reportQueueFailure(name, e, ctx) };
      }
    };

    const [loans, expenses, reversals, corrections, overdueDrawers] = await Promise.all([
      run('loans', caps.loan, () => this.loadLoanQueue(params, branchOn)),
      run('expenses', caps.expense, () => this.loadExpenseQueue(params, branchOn)),
      run('reversals', caps.reversal, () => this.loadReversalQueue(params, branchOn)),
      run('corrections', caps.correction, () => this.loadCorrectionQueue(params, branchOn)),
      // Only holders of drawer.force_close can act on an overdue drawer, so only they get the queue.
      run('overdueDrawers', caps.drawer, () => this.loadOverdueDrawerQueue(params, branchOn)),
    ]);

    if (attempted > 0 && failedQueues.length === attempted) {
      const refs = [loans, expenses, reversals, corrections, overdueDrawers]
        .map((q) => q.error?.reference).filter(Boolean).join(', ');
      throw new ServiceUnavailableException(
        `The work queue could not be loaded (no queue returned data). This is not an empty queue. Reference: ${refs}`,
      );
    }

    return {
      loans,
      expenses,
      reversals,
      corrections,
      overdueDrawers,
      // Sum of the queues that loaded. When status is 'degraded' this is a lower bound.
      total: loans.count + expenses.count + reversals.count + corrections.count + overdueDrawers.count,
      status: (failedQueues.length ? 'degraded' : 'ok') as 'ok' | 'degraded',
      failedQueues,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Structured log + safe, referenced error object for the API. */
  private reportQueueFailure(
    queue: QueueName,
    err: any,
    ctx: { tenantId: number; branchId: number | null; includeDiagnostics: boolean },
  ): QueueError {
    const diagnostic = classifyDbError(err);
    const reference = newQueueErrorReference();
    this.logger.error(
      JSON.stringify({
        event: 'pending_work_queue_failed',
        queue,
        reference,
        tenantId: ctx.tenantId,
        branchId: ctx.branchId,
        category: diagnostic.category,
        pgCode: diagnostic.pgCode,
        detail: diagnostic.detail,
        table: diagnostic.table,
        column: diagnostic.column,
        remedy: diagnostic.remedy,
      }),
      err?.stack,
    );
    return toQueueError(QUEUE_LABELS[queue], diagnostic, reference, ctx.includeDiagnostics);
  }

  private async loadLoanQueue(params: any[], branchOn: (a: string) => string): Promise<QueueResult> {
    const q = this.paymentRepo.manager;
    // loans.created_by (NOT created_by_id) is the creator column — see Loan entity / migration 001.
    // Soft-deleted loans (deleted_at) are excluded, as in getProductKpis.
    const rows = await q.query(
      `SELECT l.id, l.loan_number AS reference, l.principal_amount AS amount,
              l.branch_id, l.created_at AS submitted_at, l.status,
              u.full_name AS submitted_by, u.username AS submitted_by_username,
              c.full_name AS client_name
         FROM loans l
         LEFT JOIN users u ON u.id = l.created_by
         LEFT JOIN clients c ON c.id = l.client_id
        WHERE l.tenant_id = $1
          AND l.deleted_at IS NULL
          AND l.status IN ('PENDING_APPROVAL', 'PENDING')
          ${branchOn('l')}
        ORDER BY l.created_at ASC
        LIMIT 20`,
      params,
    );
    const [{ cnt }] = await q.query(
      `SELECT COUNT(*)::int AS cnt FROM loans l
        WHERE l.tenant_id = $1 AND l.deleted_at IS NULL
          AND l.status IN ('PENDING_APPROVAL','PENDING') ${branchOn('l')}`,
      params,
    );
    return {
      count: cnt,
      items: rows.map((r: any) => ({
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
  }

  private async loadExpenseQueue(params: any[], branchOn: (a: string) => string): Promise<QueueResult> {
    const q = this.paymentRepo.manager;
    const rows = await q.query(
      `SELECT e.id, e.amount, e.branch_id, e.created_at AS submitted_at, e.status,
              e.description, u.full_name AS submitted_by, u.username AS submitted_by_username
         FROM expenses e
         LEFT JOIN users u ON u.id = e.created_by_id
        WHERE e.tenant_id = $1
          AND e.status = 'pending'
          ${branchOn('e')}
        ORDER BY e.created_at ASC
        LIMIT 20`,
      params,
    );
    const [{ cnt }] = await q.query(
      `SELECT COUNT(*)::int AS cnt FROM expenses e
        WHERE e.tenant_id = $1 AND e.status = 'pending' ${branchOn('e')}`,
      params,
    );
    return {
      count: cnt,
      items: rows.map((r: any) => ({
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

  private async loadReversalQueue(params: any[], branchOn: (a: string) => string): Promise<QueueResult> {
    const q = this.paymentRepo.manager;
    // Requester columns come from migration 1700000000034 (reversal_requested_by/at).
    const rows = await q.query(
      `SELECT p.id, p.amount, p.branch_id,
              COALESCE(p.reversal_requested_at, p.updated_at) AS submitted_at,
              p.reversal_status AS status, p.receipt_number AS reference,
              COALESCE(p.reversal_requested_by, u.full_name, u.username) AS submitted_by,
              p.reversal_reason AS reason
         FROM payments p
         LEFT JOIN users u ON u.id = p.created_by_id
        WHERE p.tenant_id = $1
          AND p.reversal_status = 'PENDING'
          ${branchOn('p')}
        ORDER BY COALESCE(p.reversal_requested_at, p.updated_at) ASC
        LIMIT 20`,
      params,
    );
    const [{ cnt }] = await q.query(
      `SELECT COUNT(*)::int AS cnt FROM payments p
        WHERE p.tenant_id = $1 AND p.reversal_status = 'PENDING' ${branchOn('p')}`,
      params,
    );
    return {
      count: cnt,
      items: rows.map((r: any) => ({
        id: r.id,
        type: 'reversal',
        reference: r.reference || `PAY-${r.id}`,
        amount: Number(r.amount),
        branchId: r.branch_id,
        submittedAt: r.submitted_at,
        status: r.status,
        submittedBy: r.submitted_by || '—',
        description: r.reason ? String(r.reason).slice(0, 120) : undefined,
        href: `/dashboard/reversals`,
      })),
    };
  }

  private async loadCorrectionQueue(params: any[], branchOn: (a: string) => string): Promise<QueueResult> {
    const q = this.paymentRepo.manager;
    // Branch-scoped approvers only see (and may only decide) corrections of their own branch,
    // matching the check in LoansService.decideCorrection.
    const rows = await q.query(
      `SELECT c.id, c.loan_id, c.branch_id, c.correction_type, c.reason, c.created_at AS submitted_at,
              c.status, u.full_name AS submitted_by, u.username AS submitted_by_username,
              l.loan_number AS reference
         FROM loan_corrections c
         LEFT JOIN users u ON u.id = c.requested_by_id
         LEFT JOIN loans l ON l.id = c.loan_id
        WHERE c.tenant_id = $1 AND c.status = 'PENDING'
          ${branchOn('c')}
        ORDER BY c.created_at ASC LIMIT 20`,
      params,
    );
    const [{ cnt }] = await q.query(
      `SELECT COUNT(*)::int AS cnt FROM loan_corrections c
        WHERE c.tenant_id = $1 AND c.status = 'PENDING' ${branchOn('c')}`,
      params,
    );
    return {
      count: cnt,
      items: rows.map((r: any) => ({
        id: r.id,
        type: 'correction',
        reference: r.reference || `CORR-${r.id}`,
        branchId: r.branch_id,
        submittedAt: r.submitted_at,
        status: r.status,
        submittedBy: r.submitted_by || r.submitted_by_username || '—',
        description: `${r.correction_type}: ${r.reason || ''}`.slice(0, 120),
        href: `/dashboard/loans/${r.loan_id}#loan-corrections`,
      })),
    };
  }

  private async loadOverdueDrawerQueue(params: any[], branchOn: (a: string) => string): Promise<QueueResult> {
    const q = this.paymentRepo.manager;
    const rows = await q.query(
      `SELECT d.id, d.branch_id, d.drawer_date::text AS drawer_date, d.status, u.full_name AS opened_by
         FROM cash_drawers d
         LEFT JOIN users u ON u.id = d.user_id
        WHERE d.tenant_id = $1 AND d.status = 'open'
          AND d.drawer_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kampala')::date
          ${branchOn('d')}
        ORDER BY d.drawer_date ASC LIMIT 20`,
      params,
    );
    const [{ cnt }] = await q.query(
      `SELECT COUNT(*)::int AS cnt FROM cash_drawers d
        WHERE d.tenant_id = $1 AND d.status = 'open'
          AND d.drawer_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kampala')::date
          ${branchOn('d')}`,
      params,
    );
    return {
      count: cnt,
      items: rows.map((r: any) => ({
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
  }
}

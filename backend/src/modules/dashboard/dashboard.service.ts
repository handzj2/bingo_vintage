import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';          // ← fixed
import { Expense } from '../expenses/entities/expense.entity';          // ← fixed
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

  // ── Phase 5.3: product-level KPIs ─────────────────────────────────────────
  // Additive — does not modify getSummary() or any existing field. New
  // method, new endpoint, nothing existing breaks if this is never called.
  //
  // (Historical note: getSummary()'s payment filter previously compared
  // p.status = 'completed' (lowercase) against the real, uppercase-only
  // PaymentStatus enum — found while extending this file, fixed in a
  // follow-up edit using PaymentStatus.COMPLETED. See git history for the
  // exact change.)
  async getProductKpis(tenantId: number) {
    const rows: any[] = await this.paymentRepo.manager.query(
      `SELECT
         COALESCE(lp.id, NULL)                   AS loan_product_id,
         COALESCE(lp.name, INITCAP(l.loan_type))  AS product_name,
         COALESCE(lp.code, l.loan_type)           AS product_code,
         COUNT(l.id) FILTER (WHERE l.status = 'ACTIVE')       AS active_loans,
         COALESCE(SUM(l.balance) FILTER (WHERE l.status IN ('ACTIVE','DELINQUENT')), 0) AS outstanding,
         COUNT(l.id) FILTER (WHERE l.status = 'PENDING_APPROVAL') AS pending_disbursement,
         COALESCE(SUM(l.principal_amount) FILTER (WHERE l.status = 'ACTIVE' AND l.created_at >= CURRENT_DATE), 0) AS disbursed_today,
         COALESCE((
           SELECT SUM(p.amount) FROM payments p
            WHERE p.loan_id = l.id AND p.status = 'COMPLETED'
              AND p.payment_date >= CURRENT_DATE
         ), 0)                                    AS collected_today_per_loan
       FROM loans l
       LEFT JOIN loan_products lp ON lp.id = l.loan_product_id
      WHERE l.deleted_at IS NULL AND l.tenant_id = $1
      GROUP BY COALESCE(lp.id, NULL), COALESCE(lp.name, INITCAP(l.loan_type)), COALESCE(lp.code, l.loan_type)
      ORDER BY product_name`,
      [tenantId],
    );

    // PAR per product — separate query, same pattern as
    // ReportsService.getPortfolioByProduct, since it needs loan_schedules,
    // a table not already joined above.
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
}
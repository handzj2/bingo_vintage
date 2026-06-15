import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';          // ← fixed
import { Expense } from '../expenses/entities/expense.entity';          // ← fixed

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
      .andWhere('p.status = :status', { status: 'completed' });

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
}
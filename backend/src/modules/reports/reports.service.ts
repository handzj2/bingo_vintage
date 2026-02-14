import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
// ✅ FIX: Import from loans module to ensure type overlap with Loan entity
import { LoanSchedule, ScheduleStatus } from '../loans/entities/schedule.entity'; 
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
  ) {}

  async getDailySummary(date: Date = new Date()) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const payments = await this.paymentRepo.find({
      where: { paymentDate: Between(start, end) }
    });

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

    const methodBreakdown = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) acc[method] = { count: 0, amount: 0 };
      acc[method].count += 1;
      acc[method].amount += Number(payment.amountPaid);
      return acc;
    }, {} as any);

    const newLoansToday = await this.loanRepo.count({
      where: { 
        // ✅ Works now because we added 'get created_at()' to Loan entity
        createdAt: Between(start, end), 
        status: LoanStatus.ACTIVE 
      }
    });

    return {
      date: start,
      total_collected: totalCollected,
      transaction_count: payments.length,
      method_breakdown: methodBreakdown,
      new_loans: newLoansToday
    };
  }

  async getArrearsReport(startDate?: Date, endDate?: Date) {
    const today = new Date();
    const queryStartDate = startDate || new Date(0);
    const queryEndDate = endDate || today;
    
    const loans = await this.loanRepo.find({
      where: { 
        status: LoanStatus.ACTIVE,
        createdAt: Between(queryStartDate, queryEndDate)
      },
      relations: ['client', 'schedules'],
    });

    const arrearsLoans = [];

    for (const loan of loans) {
      // ✅ FIX: 'due_date' now exists because we added the getter to LoanSchedule
      const overdueSchedules = (loan.schedules || []).filter(s => 
        s.status === ScheduleStatus.PENDING && 
        new Date(s.due_date) < today 
      );

      // ✅ FIX: Using 'totalDue' or 'total_due' (if you added the getter)
      const totalOverdue = overdueSchedules.reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
      
      const daysOverdue = overdueSchedules.length > 0 
        ? Math.floor((today.getTime() - new Date(overdueSchedules[0].due_date).getTime()) / (1000 * 3600 * 24))
        : 0;

      if (daysOverdue > 0 && totalOverdue > 0) {
        arrearsLoans.push({
          loan_id: loan.id,
          loan_number: loan.loan_number, 
          client_name: `${loan.client.firstName} ${loan.client.lastName}`,
          client_phone: loan.client.phone,
          total_loan_amount: loan.principal_amount,
          balance_remaining: loan.balance,
          total_overdue_amount: totalOverdue,
          days_overdue: daysOverdue,
          last_due_date: overdueSchedules[0].due_date,
          arrears_status: this.getArrearsStatus(daysOverdue),
        });
      }
    }

    arrearsLoans.sort((a, b) => b.days_overdue - a.days_overdue);

    return {
      report_date: today,
      total_loans_in_arrears: arrearsLoans.length,
      total_overdue_amount: arrearsLoans.reduce((sum, l) => sum + l.total_overdue_amount, 0),
      arrears_loans: arrearsLoans
    };
  }

  private getArrearsStatus(daysOverdue: number): string {
    if (daysOverdue > 30) return 'CRITICAL';
    if (daysOverdue > 7) return 'WARNING';
    return 'WATCH';
  }

  async getPaymentsByDateRange(startDate: Date, endDate: Date) {
    const payments = await this.paymentRepo.find({
      where: { paymentDate: Between(startDate, endDate) },
      relations: ['loan', 'loan.client'],
    });

    return {
      total_amount: payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
      payments: payments.map(p => ({
        payment_id: p.id,
        amount: p.amountPaid,
        date: p.paymentDate,
        loan_number: p.loan?.loan_number, 
        client_name: p.loan?.client ? `${p.loan.client.firstName} ${p.loan.client.lastName}` : 'N/A'
      }))
    };
  }
}
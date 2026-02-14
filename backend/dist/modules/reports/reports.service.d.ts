import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../loans/entities/schedule.entity';
export declare class ReportsService {
    private paymentRepo;
    private loanRepo;
    private scheduleRepo;
    constructor(paymentRepo: Repository<Payment>, loanRepo: Repository<Loan>, scheduleRepo: Repository<LoanSchedule>);
    getDailySummary(date?: Date): Promise<{
        date: Date;
        total_collected: number;
        transaction_count: number;
        method_breakdown: any;
        new_loans: number;
    }>;
    getArrearsReport(startDate?: Date, endDate?: Date): Promise<{
        report_date: Date;
        total_loans_in_arrears: number;
        total_overdue_amount: any;
        arrears_loans: any[];
    }>;
    private getArrearsStatus;
    getPaymentsByDateRange(startDate: Date, endDate: Date): Promise<{
        total_amount: number;
        payments: {
            payment_id: number;
            amount: number;
            date: Date;
            loan_number: string;
            client_name: string;
        }[];
    }>;
}

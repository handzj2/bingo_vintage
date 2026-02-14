import { LoanStatus } from '../entities/loan.entity';
export declare class CreateLoanDto {
    loan_number: string;
    clientId: string;
    loanType: string;
    bikeId?: string;
    principal_amount: number;
    interest_rate: number;
    total_amount: number;
    term_months: number;
    term_weeks?: number;
    start_date: Date;
    end_date?: Date;
    status?: LoanStatus;
    deposit?: number;
    weekly_installment?: number;
    bike_id?: number;
    notes?: string;
}

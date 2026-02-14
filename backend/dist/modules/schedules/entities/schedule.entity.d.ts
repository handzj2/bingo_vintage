import { Loan } from '../../loans/entities/loan.entity';
export declare enum ScheduleStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    PARTIAL = "PARTIAL",
    OVERDUE = "OVERDUE",
    CANCELLED = "CANCELLED"
}
export declare class LoanSchedule {
    id: number;
    loan: Loan;
    loanId: number;
    get loan_id(): number;
    set loan_id(value: number);
    installmentNumber: number;
    get installment_number(): number;
    set installment_number(value: number);
    dueDate: Date;
    get due_date(): Date;
    set due_date(value: Date);
    amountDue: number;
    get amount_due(): number;
    set amount_due(value: number);
    principalDue: number;
    get principal_due(): number;
    set principal_due(value: number);
    interestDue: number;
    get interest_due(): number;
    set interest_due(value: number);
    amountPaid: number;
    get amount_paid(): number;
    set amount_paid(value: number);
    status: ScheduleStatus;
    createdAt: Date;
    get created_at(): Date;
    set created_at(value: Date);
    updatedAt: Date;
    get updated_at(): Date;
    set updated_at(value: Date);
    get is_overdue(): boolean;
    get remaining_amount(): number;
    get is_fully_paid(): boolean;
    get is_partial(): boolean;
    recordPayment(amount: number): void;
    get is_pending(): boolean;
    get days_overdue(): number;
}

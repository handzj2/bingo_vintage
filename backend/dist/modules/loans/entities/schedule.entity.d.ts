import { Loan } from './loan.entity';
export declare enum ScheduleStatus {
    PENDING = "pending",
    PAID = "paid",
    OVERDUE = "overdue",
    PARTIAL = "partial",
    WAIVED = "waived",
    DEFAULTED = "defaulted"
}
export declare class LoanSchedule {
    id: number;
    loanId: number;
    installmentNumber: number;
    dueDate: Date;
    principalAmount: number;
    interestAmount: number;
    totalDue: number;
    paidAmount: number;
    penaltyAmount: number;
    lateFeeAmount: number;
    paidDate: Date;
    paymentMethod: string;
    receiptNumber: string;
    paymentNotes: string;
    status: ScheduleStatus;
    overdueDays: number;
    loan: Loan;
    createdAt: Date;
    updatedAt: Date;
    get due_date(): Date;
    get remainingAmount(): number;
    get isOverdue(): boolean;
    get isFullyPaid(): boolean;
}

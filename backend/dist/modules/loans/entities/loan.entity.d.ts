import { Client } from '../../clients/entities/client.entity';
import { Bike } from '../../bikes/entities/bike.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { LoanSchedule } from './schedule.entity';
export declare enum LoanStatus {
    PENDING = "PENDING",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    ACTIVE = "ACTIVE",
    DELINQUENT = "DELINQUENT",
    COMPLETED = "COMPLETED",
    DEFAULTED = "DEFAULTED",
    CANCELLED = "CANCELLED"
}
export declare class Loan {
    id: number;
    loanNumber: string;
    get loan_number(): string;
    set loan_number(value: string);
    client: Client;
    clientId: number;
    principalAmount: number;
    get principal_amount(): number;
    set principal_amount(value: number);
    interestRate: number;
    totalAmount: number;
    get total_amount(): number;
    set total_amount(value: number);
    balance: number;
    termMonths: number;
    get term_months(): number;
    set term_months(value: number);
    startDate: Date;
    get start_date(): Date;
    set start_date(value: Date);
    endDate: Date;
    get end_date(): Date | null;
    set end_date(value: Date | null);
    status: LoanStatus;
    bike: Bike;
    bikeId: number;
    notes: string;
    payments: Payment[];
    schedules: LoanSchedule[];
    createdAt: Date;
    get created_at(): Date;
    updatedAt: Date;
    get updated_at(): Date;
    approvedBy: number;
    get approved_by(): number | null;
    set approved_by(value: number | null);
    approvedAt: Date;
    get approved_at(): Date | null;
    set approved_at(value: Date | null);
    createdBy: number;
    get created_by(): number | null;
    set created_by(value: number | null);
    processingFee: number;
    get processing_fee(): number;
    set processing_fee(value: number);
    deletedAt: Date;
    get deleted_at(): Date | null;
    set deleted_at(value: Date | null);
    deletedBy: number;
    get deleted_by(): number | null;
    set deleted_by(value: number | null);
    get isLocked(): boolean;
    get requiresApproval(): boolean;
    get canBeApproved(): boolean;
    get isApproved(): boolean;
    get isDelinquent(): boolean;
    get isCompleted(): boolean;
    get isCancelled(): boolean;
    get remaining_months(): number;
    get is_disbursed(): boolean;
    get disbursement_date(): Date | null;
    get total_interest_paid(): number;
    get total_principal_paid(): number;
    get total_payments_made(): number;
    get monthly_payment(): number;
    isOverdue(): boolean;
    getOverdueAmount(): number;
    getDaysOverdue(): number;
    get loan_to_value_ratio(): number | null;
    addAuditNote(action: string, performedBy: string, details: string): void;
    approve(adminId: number, comments?: string): void;
    reject(adminId: number, reason?: string): void;
    softDelete(deletedBy: number): void;
    validate(): {
        valid: boolean;
        errors: string[];
    };
}

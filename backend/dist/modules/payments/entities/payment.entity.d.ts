import { Loan } from '../../loans/entities/loan.entity';
import { PaymentMethod } from '../../enums/payment-method.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
export declare class Payment {
    id: number;
    loan: Loan;
    loanId: number;
    amount: number;
    get amountPaid(): number;
    set amountPaid(value: number);
    principalAmount: number;
    interestAmount: number;
    paymentMethod: PaymentMethod;
    receiptNumber: string;
    paymentDate: Date;
    status: PaymentStatus;
    transactionId: string;
    notes: string;
    collectedBy: string;
    reversedAt: Date;
    reversalReason: string;
    reversedBy: string;
    policyReference: string;
    createdAt: Date;
    updatedAt: Date;
}

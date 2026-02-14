import { PaymentMethod } from '../../enums/payment-method.enum';
export declare class CreatePaymentDto {
    receipt_number: string;
    loan_id: number;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: Date;
    transaction_id?: string;
    notes?: string;
    collected_by?: string;
    schedule_id?: number;
}

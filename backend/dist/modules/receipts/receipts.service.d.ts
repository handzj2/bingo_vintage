import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
export declare class ReceiptsService {
    private paymentRepo;
    constructor(paymentRepo: Repository<Payment>);
    getReceiptData(receiptNumber: string): Promise<{
        receipt_no: string;
        date: Date;
        client_name: string;
        amount: number;
        balance_remaining: number;
        collected_by: string;
        status: PaymentStatus.PENDING | PaymentStatus.COMPLETED | PaymentStatus.FAILED;
    }>;
}

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    create(createPaymentDto: CreatePaymentDto): Promise<{
        message: string;
        payment: import("./entities/payment.entity").Payment;
        receiptNumber: string;
        duplicate: boolean;
        newBalance?: undefined;
    } | {
        message: string;
        payment: import("./entities/payment.entity").Payment[];
        receiptNumber: string;
        newBalance: number;
        duplicate?: undefined;
    }>;
    findAll(): Promise<import("./entities/payment.entity").Payment[]>;
    findByLoanId(loanId: string): Promise<import("./entities/payment.entity").Payment[]>;
    findByReceiptNumber(receiptNumber: string): any;
    getTodayPayments(): any;
    getSummary(): any;
    findByDateRange(start: string, end: string): Promise<any>;
    findOne(id: string): any;
    reversePayment(id: number, reason: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            paymentId: number;
            reversedAmount: number;
            restoredBalance: number;
            reversedBy: any;
            policyReference: string;
        };
    }>;
    legacyReversePayment(id: string, reverseDto: ReversePaymentDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            paymentId: number;
            reversedAmount: number;
            restoredBalance: number;
            reversedBy: any;
            policyReference: string;
        };
    }>;
    remove(id: string): void;
}

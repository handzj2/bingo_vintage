import { Repository, Connection } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../loans/entities/schedule.entity';
import { AuditService } from '../audit/audit.service';
interface CreatePaymentServiceDto {
    loanId: number;
    amount: number;
    paymentMethod: string;
    receiptNumber: string;
    paymentDate: Date;
    transactionId?: string;
    notes?: string;
    collectedBy?: string;
    scheduleId?: number;
    idempotencyKey?: string;
}
export declare class PaymentsService {
    private paymentRepo;
    private scheduleRepo;
    private loanRepo;
    private auditService;
    private connection;
    constructor(paymentRepo: Repository<Payment>, scheduleRepo: Repository<LoanSchedule>, loanRepo: Repository<Loan>, auditService: AuditService, connection: Connection);
    create(createPaymentDto: CreatePaymentServiceDto): Promise<{
        message: string;
        payment: Payment;
        receiptNumber: string;
        duplicate: boolean;
        newBalance?: undefined;
    } | {
        message: string;
        payment: Payment[];
        receiptNumber: string;
        newBalance: number;
        duplicate?: undefined;
    }>;
    reversePayment(paymentId: number, adminUser: any, reason: string): Promise<{
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
    findAll(): Promise<Payment[]>;
    findByLoanId(loanId: number): Promise<Payment[]>;
}
export {};

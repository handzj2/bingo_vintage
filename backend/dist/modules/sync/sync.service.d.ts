import { Repository } from 'typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { Payment } from '../payments/entities/payment.entity';
export declare class SyncService {
    private loanRepo;
    private paymentRepo;
    private readonly logger;
    constructor(loanRepo: Repository<Loan>, paymentRepo: Repository<Payment>);
    reconcileBalances(): Promise<{
        message: string;
        processed: number;
        corrected: number;
    }>;
}

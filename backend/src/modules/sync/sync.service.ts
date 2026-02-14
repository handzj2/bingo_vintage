import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum'; //

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async reconcileBalances() {
    const loans = await this.loanRepo.find({ relations: ['payments'] });
    let fixedCount = 0;

    for (const loan of loans) {
      // Calculate actual paid amount from non-reversed payments
      const actualPaid = loan.payments
        .filter(p => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amountPaid), 0);

      const expectedBalance = Number(loan.total_amount) - actualPaid;

      // If database balance is out of sync, correct it
      if (Math.abs(Number(loan.balance) - expectedBalance) > 0.01) {
        await this.loanRepo.update(loan.id, { balance: expectedBalance });
        fixedCount++;
      }
    }

    return { 
      message: 'Reconciliation complete', 
      processed: loans.length, 
      corrected: fixedCount 
    };
  }
}
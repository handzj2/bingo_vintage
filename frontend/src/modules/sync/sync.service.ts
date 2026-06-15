import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(Loan)    private loanRepo:    Repository<Loan>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async reconcileBalances() {
    // FIX: Original code loaded ALL loans with ALL their payments into Node.js memory:
    //   this.loanRepo.find({ relations: ['payments'] })
    // On 200 loans × 20 payments = 4,000 objects hydrated, then iterated in JS.
    // This caused the entire Node event loop to stall for seconds.
    //
    // Replacement: single SQL query that:
    //   1. Groups completed payments by loan_id in the DB (one fast GROUP BY pass)
    //   2. Compares stored balance vs calculated balance in the same query
    //   3. Returns ONLY the rows that are actually wrong (HAVING ABS(...) > 0.01)
    //   4. We then issue one UPDATE per stale row — only fixes that need fixing
    //
    // Total: 1 round-trip instead of N+1. Works correctly at any scale.

    const staleLoans: Array<{ id: number; expected: string }> =
      await this.loanRepo.manager.query(
        `SELECT
            l.id,
            (l.total_amount - COALESCE(SUM(
              CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END
            ), 0)) AS expected
           FROM loans l
           LEFT JOIN payments p ON p.loan_id = l.id
          GROUP BY l.id, l.total_amount, l.balance
         HAVING ABS(
           l.balance - (l.total_amount - COALESCE(SUM(
             CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END
           ), 0))
         ) > 0.01`,
      );

    let fixedCount = 0;
    for (const row of staleLoans) {
      await this.loanRepo.update(row.id, { balance: Number(row.expected) });
      fixedCount++;
    }

    this.logger.log(`Reconciliation complete — ${fixedCount} loan(s) corrected`);

    return {
      message:   'Reconciliation complete',
      processed: staleLoans.length,
      corrected: fixedCount,
    };
  }
}

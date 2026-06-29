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

  async reconcileBalances(tenantId: number) {
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
    //
    // SYNC-001: scoped to a single tenant. The prior version had no tenant_id
    // filter anywhere, meaning a reconciliation run for one tenant would read
    // and potentially overwrite every tenant's loan balances.

    const staleLoans: Array<{ id: number; expected: string }> =
      await this.loanRepo.manager.query(
        `SELECT
            l.id,
            (l.total_amount - COALESCE(SUM(
              CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END
            ), 0)) AS expected
           FROM loans l
           LEFT JOIN payments p ON p.loan_id = l.id
          WHERE l.tenant_id = $1
          GROUP BY l.id, l.total_amount, l.balance
         HAVING ABS(
           l.balance - (l.total_amount - COALESCE(SUM(
             CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END
           ), 0))
         ) > 0.01`,
        [tenantId],
      );

    let fixedCount = 0;
    if (staleLoans.length > 0) {
      await this.loanRepo.manager.transaction(async (txManager) => {
        for (const row of staleLoans) {
          // tenantId re-asserted in the WHERE clause as a defence-in-depth check —
          // row.id came from a tenant-scoped query above, but this guarantees the
          // UPDATE itself can never cross a tenant boundary even if that changes.
          await txManager.update(Loan, { id: row.id, tenantId } as any, { balance: Number(row.expected) });
          fixedCount++;
        }
      });
    }

    this.logger.log(`Reconciliation complete — tenant=${tenantId} — ${fixedCount} loan(s) corrected`);

    return {
      message:   'Reconciliation complete',
      processed: staleLoans.length,
      corrected: fixedCount,
    };
  }
}

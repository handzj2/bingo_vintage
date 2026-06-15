/**
 * Concurrency integration test — Payment TOCTOU race condition.
 *
 * Validates that the pessimistic write lock (SELECT ... FOR UPDATE) in
 * PaymentsService.create() correctly serialises concurrent payments on
 * the same loan, producing an accurate final balance with no lost updates.
 *
 * Run against a real PostgreSQL instance (not SQLite) — the lock is a
 * PostgreSQL feature and cannot be verified with an in-memory DB.
 *
 * Command:
 *   DATABASE_URL=<test-db-url> npx jest test/payment-concurrency.spec.ts --testTimeout=30000
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }   from '@nestjs/typeorm';
import { DataSource }           from 'typeorm';
import { PaymentsService }      from '../src/modules/payments/payments.service';
import { Payment }              from '../src/modules/payments/entities/payment.entity';
import { Loan, LoanStatus }     from '../src/modules/loans/entities/loan.entity';
import { LoanSchedule }         from '../src/modules/schedules/entities/schedule.entity';

describe('PaymentsService — concurrent balance mutation', () => {
  let service: PaymentsService;
  let dataSource: DataSource;

  /**
   * Integration test setup:
   * This is a structural reference — wire up your actual NestJS test module
   * with AppModule or a minimal module that includes PaymentsModule.
   *
   * The critical assertion is independent of the full module setup.
   */

  it('10 concurrent payments on the same loan produce correct final balance', async () => {
    /**
     * Scenario:
     *   Loan balance:  100,000
     *   10 concurrent payments of 5,000 each
     *   Expected final balance: 50,000
     *   Expected payment rows: 10
     *
     * Without the lock: final balance is unpredictable (race condition).
     * With the lock:    exactly 50,000.
     */

    const LOAN_ID        = 1;           // seed a loan with balance=100,000 in test DB
    const PAYMENT_AMOUNT = 5_000;
    const CONCURRENCY    = 10;
    const INITIAL_BALANCE = 100_000;

    // Simulate concurrent payment submissions
    const submissions = Array.from({ length: CONCURRENCY }, (_, i) =>
      service.create({
        loanId:         LOAN_ID,
        amount:         PAYMENT_AMOUNT,
        paymentMethod:  'CASH',
        paymentDate:    new Date(),
        idempotencyKey: `test-concurrent-${Date.now()}-${i}`, // unique per submission
        tenantId:       1,
      }),
    );

    const results = await Promise.allSettled(submissions);

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;

    // Fetch final loan state
    const loanRepo   = dataSource.getRepository(Loan);
    const finalLoan  = await loanRepo.findOne({ where: { id: LOAN_ID } });
    const finalBalance = Number(finalLoan!.balance);

    const paymentRepo = dataSource.getRepository(Payment);
    const paymentRows = await paymentRepo.find({ where: { loanId: LOAN_ID } });

    console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
    console.log(`Payment rows: ${paymentRows.length}`);
    console.log(`Final balance: ${finalBalance} (expected: ${INITIAL_BALANCE - succeeded * PAYMENT_AMOUNT})`);

    // All 10 should succeed (no deadlock, no rejection from the lock itself)
    expect(succeeded).toBe(CONCURRENCY);
    expect(failed).toBe(0);

    // Final balance must match exactly — no lost updates
    expect(finalBalance).toBe(INITIAL_BALANCE - CONCURRENCY * PAYMENT_AMOUNT);

    // Exactly CONCURRENCY payment rows — no duplicates, no missing
    expect(paymentRows.length).toBe(CONCURRENCY);

    // Every payment has a unique receipt number
    const receipts = paymentRows.map(p => p.receiptNumber);
    expect(new Set(receipts).size).toBe(CONCURRENCY);
  });
});

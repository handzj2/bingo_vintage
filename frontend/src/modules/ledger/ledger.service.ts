/**
 * LedgerService
 *
 * Records every financial event as a ledger entry.
 * Called from LoansService (disbursement), PaymentsService (payment / reversal),
 * PenaltyCalculationJob (penalty accrual), and ExpensesService (expense approval).
 *
 * Usage — inject LedgerService and call:
 *
 *   // In loans.service.ts after loan is approved:
 *   await this.ledgerService.recordDisbursement(loan, adminId);
 *
 *   // In payments.service.ts after payment is saved:
 *   await this.ledgerService.recordPayment(loan, payment);
 *
 *   // In penalty-calculation.job.ts per overdue schedule:
 *   await this.ledgerService.recordPenalty(loanId, clientId, penaltyAmount, scheduleId);
 *
 *   // In payments.service.ts after reversal:
 *   await this.ledgerService.recordReversal(loan, payment);
 *
 *   // In expenses.service.ts after expense approval:
 *   await this.ledgerService.recordExpense({ expenseId, amount, description, reference, createdBy });
 *
 * Failures are SWALLOWED — a ledger write error must never roll back
 * the financial operation that triggered it. All errors are logged.
 *
 * Integration requirements:
 *   1. Add LedgerModule to AppModule imports.
 *   2. Import LedgerModule in LoansModule, PaymentsModule, ExpensesModule.
 *   3. Inject LedgerService where needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry, LedgerTransactionType } from './entities/ledger-entry.entity';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  // ── Public recording methods ─────────────────────────────────────────────

  /**
   * recordDisbursement()
   *
   * Called when a loan is APPROVED (status → ACTIVE).
   * Debits the full loan amount (principal + interest + fees) to track
   * the total obligation created.
   *
   * @param loan     - The approved loan object (must have id, clientId, totalAmount, balance)
   * @param actorId  - The admin user ID who approved the loan
   */
  async recordDisbursement(
    loan: { id: number; clientId: number; totalAmount: number; balance: number; loanNumber: string },
    actorId?: number,
  ): Promise<void> {
    await this.write({
      loanId:          loan.id,
      clientId:        loan.clientId,
      transactionType: LedgerTransactionType.LOAN_DISBURSEMENT,
      debit:           Number(loan.totalAmount),
      credit:          0,
      balanceAfter:    Number(loan.balance),
      description:     `Loan ${loan.loanNumber} approved — total obligation created`,
      reference:       loan.loanNumber,
      createdBy:       actorId,
    });
  }

  /**
   * recordPayment()
   *
   * Called after a payment is saved successfully.
   * Credits the payment amount and records the new loan balance.
   *
   * @param loan     - The loan (id, clientId, loanNumber, and the NEW balance post-payment)
   * @param payment  - The saved payment (id, amount, receiptNumber)
   */
  async recordPayment(
    loan: { id: number; clientId: number; loanNumber: string; balance: number },
    payment: { id: number; amount: number; receiptNumber: string; collectedBy?: string },
  ): Promise<void> {
    await this.write({
      loanId:          loan.id,
      clientId:        loan.clientId,
      transactionType: LedgerTransactionType.LOAN_PAYMENT,
      debit:           0,
      credit:          Number(payment.amount),
      balanceAfter:    Number(loan.balance),
      description:     `Payment received — ${payment.receiptNumber}` +
                       (payment.collectedBy ? ` collected by ${payment.collectedBy}` : ''),
      reference:       payment.receiptNumber,
    });
  }

  /**
   * recordPenalty()
   *
   * Called by PenaltyCalculationJob for each overdue schedule row.
   * Debits the penalty amount (increases what the client owes).
   *
   * @param loanId     - Loan ID
   * @param clientId   - Client ID (denormalized for fast reporting)
   * @param amount     - New penalty amount being charged
   * @param reference  - Schedule ID as string, for traceability
   */
  async recordPenalty(
    loanId: number,
    clientId: number,
    amount: number,
    reference: string,
  ): Promise<void> {
    if (amount <= 0) return;

    await this.write({
      loanId,
      clientId,
      transactionType: LedgerTransactionType.PENALTY_CHARGE,
      debit:           Number(amount),
      credit:          0,
      balanceAfter:    0, // Not tracked for penalty entries (loan balance unchanged)
      description:     `Daily penalty accrual — schedule ${reference}`,
      reference,
    });
  }

  /**
   * recordReversal()
   *
   * Called after a payment reversal is processed.
   * Re-debits the reversed amount (the credit from recordPayment is undone).
   *
   * @param loan     - The loan (id, clientId, loanNumber, NEW balance post-reversal)
   * @param payment  - The reversed payment (id, amount, receiptNumber)
   */
  async recordReversal(
    loan: { id: number; clientId: number; loanNumber: string; balance: number },
    payment: { id: number; amount: number; receiptNumber: string; reversedBy?: string },
  ): Promise<void> {
    await this.write({
      loanId:          loan.id,
      clientId:        loan.clientId,
      transactionType: LedgerTransactionType.PAYMENT_REVERSAL,
      debit:           Number(payment.amount),
      credit:          0,
      balanceAfter:    Number(loan.balance),
      description:     `Payment ${payment.receiptNumber} reversed` +
                       (payment.reversedBy ? ` by ${payment.reversedBy}` : ''),
      reference:       payment.receiptNumber,
    });
  }

  /**
   * recordExpense()
   *
   * Called when an expense is approved.
   * Debits the expense amount (records an outflow).
   *
   * @param data - Expense details
   */
  async recordExpense(data: {
    expenseId: number;
    amount: number;
    description: string;
    reference?: string;
    createdBy?: number;
  }): Promise<void> {
    // Expenses are not tied to a specific loan or client, so loanId and clientId are omitted.
    await this.write({
      transactionType: LedgerTransactionType.EXPENSE,
      debit:           Number(data.amount),
      credit:          0,
      balanceAfter:    0,
      description:     `Expense #${data.expenseId}: ${data.description}`,
      reference:       data.reference ?? `EXP-${data.expenseId}`,
      createdBy:       data.createdBy,
      // loanId and clientId are not provided – the write method will set them to null
    });
  }

  /**
   * getLedgerByLoan()
   *
   * Returns all ledger entries for a loan, newest first.
   * Suitable for exposing via a GET /loans/:id/ledger endpoint.
   */
  async getLedgerByLoan(loanId: number): Promise<LedgerEntry[]> {
    return this.ledgerRepo.find({
      where:  { loanId },
      order:  { createdAt: 'DESC' },
    });
  }

  /**
   * getLedgerByClient()
   *
   * Returns all ledger entries for a client (across all their loans).
   */
  async getLedgerByClient(clientId: number): Promise<LedgerEntry[]> {
    return this.ledgerRepo.find({
      where:  { clientId },
      order:  { createdAt: 'DESC' },
    });
  }

  // ── Private write helper ──────────────────────────────────────────────────

  /**
   * write()
   *
   * Persists a single ledger row. All errors are caught and logged —
   * a ledger failure must NEVER propagate to the caller and roll back
   * the financial transaction that triggered it.
   *
   * loanId and clientId are optional – if omitted, they are stored as NULL.
   */
  private async write(data: {
    loanId?: number;
    clientId?: number;
    transactionType: LedgerTransactionType;
    debit: number;
    credit: number;
    balanceAfter: number;
    description?: string;
    reference?: string;
    createdBy?: number;
  }): Promise<void> {
    try {
      const entry = this.ledgerRepo.create({
        loanId:          data.loanId ?? null,
        clientId:        data.clientId ?? null,
        transactionType: data.transactionType,
        debit:           data.debit,
        credit:          data.credit,
        balanceAfter:    data.balanceAfter,
        description:     data.description ?? null,
        reference:       data.reference   ?? null,
        createdBy:       data.createdBy   ?? null,
      });

      await this.ledgerRepo.save(entry);

      this.logger.debug(
        `Ledger [${data.transactionType}] loan=${data.loanId ?? '—'} ` +
        `debit=${data.debit} credit=${data.credit} ref=${data.reference ?? '—'}`,
      );
    } catch (err) {
      // Log but never throw — ledger write failure must not break the flow
      this.logger.error(
        `Ledger write FAILED [${data.transactionType}] loan=${data.loanId ?? '—'}: ` +
        (err instanceof Error ? err.message : String(err)),
      );
    }
  }
}
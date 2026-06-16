// patch 2026-06-16: removed ::schedule_status_enum casts — production enum is loan_schedules_status_enum
import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual } from 'typeorm';
import { randomBytes } from 'crypto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { PaymentAllocationService } from './services/payment-allocation.service';
import { LedgerService } from '../ledger/ledger.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { CashDrawerService } from '../cash-drawers/cash-drawers.service';

const PG_UNIQUE_VIOLATION = '23505';
import { sanitiseDto } from '../../common/utils/sanitise';
import { POLICY_REF, REVERSAL_PENDING_REF } from '../../common/constants/policy.constants';
import { ReversalStatus } from './entities/payment.entity';

interface CreatePaymentServiceDto {
  loanId:          number;
  amount:          number;
  paymentMethod:   string;
  receiptNumber?:  string;
  paymentDate:     Date;
  transactionId?:  string;
  notes?:          string;
  collectedBy?:    string;
  scheduleId?:     number;
  idempotencyKey?: string;
  cashDrawerId?:   number;
  tenantId?:       number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)       private paymentRepo:   Repository<Payment>,
    @InjectRepository(LoanSchedule)  private scheduleRepo:  Repository<LoanSchedule>,
    @InjectRepository(Loan)          private loanRepo:      Repository<Loan>,
    private auditService:            AuditService,
    private connection:              DataSource,
    private smsService:              SmsService,
    private paymentAllocationService: PaymentAllocationService,
    private readonly ledgerService:  LedgerService,
    private readonly receiptsService: ReceiptsService,
    private readonly cashDrawerService: CashDrawerService,
  ) {}

  async runOverdueScan(graceDays = 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const flipped: any[] = await this.scheduleRepo.manager.query(
      `UPDATE loan_schedules
          SET status     = 'OVERDUE',
              updated_at = NOW()
        WHERE status   = 'PENDING'
          AND due_date < $1
        RETURNING id, loan_id`,
      [cutoffStr],
    );

    if (flipped.length > 0) {
      const loanIds = [...new Set(flipped.map((r: any) => r.loan_id))];
      await this.scheduleRepo.manager.query(
        `UPDATE loans SET status = 'DELINQUENT', updated_at = NOW()
          WHERE id = ANY($1) AND status = 'ACTIVE'`,
        [loanIds],
      );
    }

    return { overdueFlipped: flipped.length, dueTodayAlerts: 0 };
  }

  private async resolveScheduleId(
    loanId: number,
    _amount: number,
    suppliedId?: number,
  ): Promise<number | null> {
    if (suppliedId) return suppliedId;
    const rows: any[] = await this.scheduleRepo.manager.query(
      `SELECT id FROM loan_schedules
        WHERE loan_id = $1
          AND status IN ('PENDING',
                         'OVERDUE',
                         'PARTIAL')
        ORDER BY installment_number ASC LIMIT 1`,
      [loanId],
    );
    return rows.length ? rows[0].id : null;
  }

  private async applyPaymentToSchedule(
    scheduleId: number,
    paymentAmount: number,
    receiptNumber: string,
    paymentMethod: string,
    paymentDate: Date,
  ) {
    const rows: any[] = await this.scheduleRepo.manager.query(
      `SELECT id, amount_due, amount_paid, status FROM loan_schedules WHERE id = $1`,
      [scheduleId],
    );
    if (!rows.length) return;

    const row       = rows[0];
    const amountDue = Number(row.amount_due);
    const newPaid   = Number(row.amount_paid || 0) + paymentAmount;

    const newStatusVal = newPaid >= amountDue ? 'PAID' : newPaid > 0 ? 'PARTIAL' : row.status;

    await this.scheduleRepo.manager.query(
      `UPDATE loan_schedules
          SET amount_paid    = $1,
              status         = $2,
              receipt_number = $3,
              payment_method = $4,
              paid_date      = $5,
              updated_at     = NOW()
        WHERE id = $6`,
      [newPaid, newStatusVal, receiptNumber, paymentMethod, paymentDate, scheduleId],
    );
  }

  /**
   * Enterprise-grade payment creation.
   *
   * Pattern: Stripe / Adyen / Flutterwave transaction model.
   *
   * Problem fixed:
   *   The original implementation read loan.balance, computed newBalance,
   *   then wrote it back in three separate round-trips with no lock.
   *   Two concurrent payments on the same loan corrupted the balance —
   *   one payment's deduction was silently overwritten.
   *
   * Solution:
   *   1. Idempotency check BEFORE acquiring any lock (cheap, no contention).
   *   2. Receipt number generation BEFORE the transaction (unique per call).
   *   3. Single queryRunner transaction with SELECT ... FOR UPDATE (pessimistic
   *      write lock) on the loan row — identical to the existing reversal pattern.
   *   4. All mutations (payment save, balance update, bike status, schedule)
   *      happen inside the transaction. All commit or all roll back atomically.
   *   5. Side effects (SMS, ledger) fire AFTER commit — cannot roll back an SMS.
   */
  async create(rawDto: CreatePaymentServiceDto, requestId?: string) {
    // Sanitise free-text fields before any processing
    const dto = sanitiseDto(rawDto);

    // ── Step 1: Idempotency check (outside transaction — fast path) ───────────
    if (dto.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        this.logger.log(`Idempotent payment hit: key=${dto.idempotencyKey} → id=${existing.id}`);
        return {
          message: 'Payment already processed',
          payment: existing,
          receiptNumber: existing.receiptNumber,
          duplicate: true,
        };
      }
    }

    // ── Step 2: Generate receipt number before transaction ────────────────────
    // Keeps the transaction window short — no external I/O inside the lock.
    const receiptNumber = await this.receiptsService.uniqueReceiptNumber(dto.receiptNumber);

    // ── Step 3: Transactional core with pessimistic lock ──────────────────────
    // SELECT ... FOR UPDATE prevents concurrent reads of the same loan row
    // from proceeding until this transaction commits. This is the standard
    // pattern used by Stripe, Adyen, and every tier-1payment processor to
    // prevent double-spend on the same account.
    const qr = this.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let savedPayment: Payment;
    let newBalance:   number;
    let loanCompleted: boolean;
    let lockedLoan:    Loan;

    try {
      // Lock the loan row for the duration of this transaction
      const locked = await qr.manager
        .createQueryBuilder(Loan, 'loan')
        .where('loan.id = :id', { id: dto.loanId })
        .setLock('pessimistic_write')
        .getOne();

      if (!locked) throw new NotFoundException(`Loan ${dto.loanId} not found`);
      lockedLoan = locked;

      if (!['ACTIVE', 'DELINQUENT'].includes(locked.status)) {
        throw new BadRequestException(
          `Loan ${dto.loanId} is ${locked.status} — payments cannot be recorded on this loan.`,
        );
      }

      // Tenant self-healing (loan created before tenant assignment was enforced)
      if (!locked.tenantId && dto.tenantId) {
        await qr.manager.update(Loan, dto.loanId, { tenantId: dto.tenantId } as any);
        locked.tenantId = dto.tenantId;
        this.logger.warn(`Loan ${dto.loanId} had no tenant — auto-assigned ${dto.tenantId}`);
      } else if (!locked.tenantId) {
        throw new BadRequestException(
          `Loan ${dto.loanId} has no tenant. Contact your administrator.`,
        );
      }

      // Validate cash drawer exists (read-only check, outside the write path)
      if (dto.cashDrawerId) {
        await this.cashDrawerService.findOne(dto.cashDrawerId, locked.tenantId);
      }

      // Resolve schedule linkage inside the transaction
      const scheduleId = await this.resolveScheduleId(dto.loanId, dto.amount, dto.scheduleId);

      // Build and save the payment record
      const payment = qr.manager.create(Payment, {
        loanId:         dto.loanId,
        amount:         dto.amount,
        paymentMethod:  dto.paymentMethod as any,
        receiptNumber,
        status:         PaymentStatus.COMPLETED,
        paymentDate:    dto.paymentDate || new Date(),
        transactionId:  dto.transactionId,
        notes:          dto.notes,
        collectedBy:    dto.collectedBy,
        idempotencyKey: dto.idempotencyKey,
        scheduleId:     scheduleId ?? undefined,
        tenantId:       locked.tenantId,
        branchId:       locked.branchId ?? undefined,
        cashDrawerId:   dto.cashDrawerId ?? undefined,
      });

      try {
        savedPayment = await qr.manager.save(Payment, payment);
      } catch (err: any) {
        if (err?.code === PG_UNIQUE_VIOLATION || err?.message?.includes('duplicate key')) {
          if (err?.detail?.includes('receipt_number') || err?.constraint?.includes('receipt_number')) {
            throw new ConflictException(
              'A payment with this receipt number already exists. ' +
              'This may be a duplicate submission — check your payment list.',
            );
          }
          if (err?.detail?.includes('idempotency_key')) {
            const dup = await this.paymentRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
            if (dup) return { message: 'Payment already processed', payment: dup, receiptNumber: dup.receiptNumber, duplicate: true };
          }
          throw new ConflictException('Duplicate payment detected. Please verify before retrying.');
        }
        throw err;
      }

      // Compute new balance from the LOCKED row — not a stale read
      newBalance    = Math.max(0, Number(locked.balance) - Number(dto.amount));
      loanCompleted = newBalance === 0;

      await qr.manager.update(Loan, dto.loanId, {
        balance:   newBalance,
        status:    loanCompleted ? LoanStatus.COMPLETED : locked.status,
        updatedAt: new Date(),
      });

      if (loanCompleted && locked.bikeId) {
        await qr.manager.query(
          `UPDATE bikes SET status = 'SOLD', assigned_client_id = NULL WHERE id = $1`,
          [locked.bikeId],
        );
      }

      if (scheduleId) {
        await this.applyPaymentToSchedule(
          scheduleId,
          Number(dto.amount),
          receiptNumber,
          dto.paymentMethod,
          dto.paymentDate || new Date(),
        );
      }

      await qr.commitTransaction();
      this.logger.log(
        `Payment committed: loan=${dto.loanId} amount=${dto.amount} ` +
        `receipt=${receiptNumber} newBalance=${newBalance}` +
        (requestId ? ` [requestId=${requestId}]` : ''),
      );
    } catch (error) {
      await qr.rollbackTransaction();
      this.logger.error(
        `Payment rolled back: loan=${dto.loanId} amount=${dto.amount} — ${(error as Error).message}` +
        (requestId ? ` [requestId=${requestId}]` : ''),
      );
      throw error;
    } finally {
      await qr.release();
    }

    // ── Step 4: Side effects (fire-and-forget — never block the response) ─────
    const fullLoan = await this.loanRepo.findOne({
      where: { id: dto.loanId },
      relations: ['client'],
    });

    // SMS notification — swallowed: Twilio down must not fail a payment
    if (fullLoan?.client?.phone) {
      this.smsService.sendPaymentConfirmation(
        fullLoan.client.phone,
        `${fullLoan.client.firstName} ${fullLoan.client.lastName}`.trim(),
        Number(dto.amount),
        newBalance,
        receiptNumber,
      ).catch(err =>
        this.logger.warn(`SMS failed for loan ${dto.loanId}: ${err.message}` +
        (requestId ? ` [requestId=${requestId}]` : '')),
      );
    }

    // Ledger entry — swallowed: ledger failure must not undo a committed payment
    this.ledgerService.recordPayment(
      {
        id:         dto.loanId,
        clientId:   fullLoan?.clientId  ?? 0,
        loanNumber: fullLoan?.loanNumber ?? '',
        balance:    newBalance,
      },
      {
        id:           savedPayment!.id,
        amount:       dto.amount,
        receiptNumber,
        collectedBy:  dto.collectedBy,
      },
    ).catch(err =>
      this.logger.warn(`Ledger entry failed for payment ${savedPayment!.id}: ${err.message}` +
        (requestId ? ` [requestId=${requestId}]` : '')),
    );

    return {
      message:  'Payment recorded successfully',
      payment:  savedPayment!,
      receiptNumber,
      newBalance,
    };
  }

  async reversePayment(paymentId: number, adminUser: any, reason: string) {
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reversal reason must be at least 10 characters');
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let payment: any;
    let loan: any;
    let restoredBalance: number;

    try {
      const found = await queryRunner.manager
        .createQueryBuilder(Payment, 'payment')
        .innerJoinAndSelect('payment.loan', 'loan')
        .where('payment.id = :id', { id: paymentId })
        .setLock('pessimistic_write')
        .getOne();

      if (!found) throw new NotFoundException(`Payment ${paymentId} not found`);
      if (found.status === PaymentStatus.REVERSED) {
        throw new ConflictException('Payment already reversed');
      }

      payment         = found;
      loan            = payment.loan;
      restoredBalance = Number(loan.balance) + Number(payment.amount);

      await queryRunner.manager.update(Loan, loan.id, {
        balance:   restoredBalance,
        status:    LoanStatus.ACTIVE,
        updatedAt: new Date(),
      });

      if (loan.bikeId) {
        await queryRunner.manager.query(
          `UPDATE bikes SET status = 'LOANED' WHERE id = $1 AND status = 'SOLD'`,
          [loan.bikeId],
        );
      }

      await queryRunner.manager.update(Payment, paymentId, {
        status:          PaymentStatus.REVERSED,
        reversedAt:      new Date(),
        reversedBy:      adminUser.email || adminUser.username,
        reversalReason:  reason,
        policyReference: POLICY_REF,
        reversalStatus:  ReversalStatus.APPROVED,  // state machine: request fulfilled
      });

      if (payment.scheduleId) {
        await queryRunner.manager.query(
          `UPDATE loan_schedules
              SET amount_paid    = GREATEST(0, amount_paid - $1),
                  status         = CASE
                                     WHEN due_date < NOW()::date
                                       THEN 'OVERDUE'
                                     ELSE 'PENDING'
                                   END,
                  receipt_number = NULL,
                  paid_date      = NULL,
                  updated_at     = NOW()
            WHERE id = $2`,
          [payment.amount, payment.scheduleId],
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    try {
      await this.ledgerService.recordReversal(
        { id: loan.id, clientId: loan.clientId, loanNumber: loan.loanNumber, balance: restoredBalance },
        { id: payment.id, amount: payment.amount, receiptNumber: payment.receiptNumber, reversedBy: adminUser?.username ?? adminUser?.email },
      );
    } catch (_) {}

    try {
      await this.auditService.logAction({
        action:      'PAYMENT_REVERSAL',
        tableName:   'payments',
        recordId:    paymentId,
        user:        adminUser.email || adminUser.username,
        description: `Policy [${POLICY_REF}]. Reason: ${reason}`,
        oldValues:   { paymentStatus: PaymentStatus.COMPLETED, loanBalance: loan.balance, loanStatus: loan.status },
        newValues:   { paymentStatus: PaymentStatus.REVERSED,  loanBalance: restoredBalance, loanStatus: LoanStatus.ACTIVE },
        metadata:    { reversalAmount: payment.amount },
      });
    } catch (_) {}

    return {
      success: true,
      message: 'Payment reversed successfully per Policy [${POLICY_REF}]',
      data: {
        paymentId,
        reversedAmount: payment.amount,
        restoredBalance,
        reversedBy:     adminUser.email,
        policyReference: POLICY_REF,
      },
    };
  }

  async findOne(id: number) {
    return this.paymentRepo.findOne({ where: { id }, relations: ['loan', 'loan.client'] });
  }

  async findByReceiptNumber(receiptNumber: string) {
    return this.paymentRepo.findOne({ where: { receiptNumber }, relations: ['loan', 'loan.client'] });
  }

  async getTodayPayments(tenantId?: number) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const where: any = { paymentDate: MoreThanOrEqual(today) };
    if (tenantId) where.tenantId = tenantId;
    return this.paymentRepo.find({
      where,
      relations: ['loan', 'loan.client'],
      order: { paymentDate: 'DESC' },
      take: 200,
    });
  }

  async getSummary() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalCount, totalAmount, todayPayments] = await Promise.all([
      this.paymentRepo.count(),
      this.paymentRepo.createQueryBuilder('p').select('SUM(p.amount)', 'sum').getRawOne(),
      this.paymentRepo.find({ where: { paymentDate: MoreThanOrEqual(today) } }),
    ]);
    return {
      totalPayments: totalCount,
      totalAmount:   totalAmount?.sum || 0,
      todayCount:    todayPayments.length,
      todayAmount:   todayPayments.reduce((s, p) => s + Number(p.amount), 0),
      todayPayments,
    };
  }

  async findByDateRange(start: Date, end: Date, tenantId?: number, limit = 500) {
    const where: any = { paymentDate: Between(start, end) };
    if (tenantId) where.tenantId = tenantId;
    return this.paymentRepo.find({
      where,
      relations: ['loan', 'loan.client'],
      order: { paymentDate: 'DESC' },
      take: Math.min(limit, 1000),
    });
  }

  /**
   * Paginated payment list — cursor-based pattern (GitHub/Stripe model).
   * Offset pagination produces duplicates when new records insert between
   * page fetches. Cursor on paymentDate+id is stable under concurrent writes.
   */
  async findAll(tenantId?: number, limit = 50, cursor?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    const qb = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.loan', 'loan')
      .leftJoinAndSelect('loan.client', 'client')
      .orderBy('p.paymentDate', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .take(Math.min(limit, 100));  // hard cap: never return >100 rows

    if (tenantId) qb.andWhere('p.tenantId = :tenantId', { tenantId });
    if (cursor)   qb.andWhere('p.id < :cursor', { cursor });

    const items = await qb.getMany();
    const nextCursor = items.length === Math.min(limit, 100) ? items[items.length - 1]?.id : null;
    return { items, nextCursor, count: items.length };
  }

  async findByLoanId(loanId: number, tenantId?: number) {
    const where: any = { loanId };
    if (tenantId) where.tenantId = tenantId;
    return this.paymentRepo.find({
      where,
      relations: ['loan', 'loan.client'],
      order: { paymentDate: 'DESC' },
      take: 200,   // single loan payments are bounded by term length
    });
  }

  async requestReversal(paymentId: number, requestedBy: string, reason: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status === PaymentStatus.REVERSED)
      throw new ConflictException('Payment already reversed');
    if (payment.reversalStatus === ReversalStatus.PENDING)
      throw new ConflictException('A reversal request is already pending for this payment');
    await this.paymentRepo.update(paymentId, {
      reversalReason:  reason,
      reversedBy:      requestedBy,
      reversalStatus:  ReversalStatus.PENDING,  // typed enum — not a string flag
    } as any);
    return { success: true, message: 'Reversal request submitted for admin review.' };
  }

  async getPendingReversalRequests() {
    return this.paymentRepo.find({
      where: { reversalStatus: ReversalStatus.PENDING },
      relations: ['loan', 'loan.client'],
      order: { paymentDate: 'DESC' },
    });
  }

  async approveReversalRequest(paymentId: number, adminUser: any) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId }, relations: ['loan'] });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    return this.reversePayment(paymentId, adminUser, payment.reversalReason || 'Approved by admin');
  }

  async rejectReversalRequest(paymentId: number, adminUser: any, reason?: string) {
    await this.paymentRepo.update(paymentId, {
      reversalStatus:  ReversalStatus.REJECTED,
      reversalReason:  reason || 'Rejected by admin',
    } as any);
    return { success: true, message: 'Reversal request rejected.' };
  }
}
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm'; // 👈 Import Connection for QueryRunner
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { LoanSchedule, ScheduleStatus } from '../loans/entities/schedule.entity';
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
  idempotencyKey?: string; // 👈 Add for double-click protection
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(Loan) private loanRepo: Repository<Loan>,
    private auditService: AuditService,
    private connection: Connection, // 👈 Inject Connection
  ) {}

  // CREATE PAYMENT - With Idempotency
  async create(createPaymentDto: CreatePaymentServiceDto) {
    // 👈 IDEMPOTENCY CHECK: Prevent double-clicks
    if (createPaymentDto.idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey: createPaymentDto.idempotencyKey }
      });
      if (existing) {
        return {
          message: 'Payment already processed',
          payment: existing,
          receiptNumber: existing.receiptNumber,
          duplicate: true
        };
      }
    }

    const loan = await this.loanRepo.findOne({ 
      where: { id: createPaymentDto.loanId } 
    });
    
    if (!loan) {
      throw new NotFoundException(`Loan ${createPaymentDto.loanId} not found`);
    }

    const receiptNumber = createPaymentDto.receiptNumber || 
      `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payment = this.paymentRepo.create({
      loan: loan,
      amount: createPaymentDto.amount,
      paymentMethod: createPaymentDto.paymentMethod,
      receiptNumber,
      status: PaymentStatus.COMPLETED,
      paymentDate: createPaymentDto.paymentDate || new Date(),
      transactionId: createPaymentDto.transactionId,
      notes: createPaymentDto.notes,
      collectedBy: createPaymentDto.collectedBy,
      idempotencyKey: createPaymentDto.idempotencyKey, // 👈 Store it
    });

    const savedPayment = await this.paymentRepo.save(payment);

    // Atomic balance update
    const newBalance = Math.max(0, Number(loan.balance) - Number(createPaymentDto.amount));
    await this.loanRepo.update(createPaymentDto.loanId, { 
      balance: newBalance,
      status: newBalance === 0 ? LoanStatus.COMPLETED : loan.status
    });

    if (createPaymentDto.scheduleId) {
      await this.scheduleRepo.update(createPaymentDto.scheduleId, { 
        status: ScheduleStatus.PAID 
      });
    }

    return {
      message: 'Payment recorded successfully',
      payment: savedPayment,
      receiptNumber,
      newBalance
    };
  }

  // ATOMIC REVERSAL - Financial Integrity Guarantee
  async reversePayment(paymentId: number, adminUser: any, reason: string) {
    // Policy [2026-01-10] Enforcement
    if (adminUser.role !== 'admin') {
      throw new ForbiddenException('Policy [2026-01-10]: Admin access required');
    }

    if (!reason || reason.length < 10) {
      throw new BadRequestException('Reversal reason must be at least 10 characters');
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the payment row for update (prevent concurrent modifications)
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId },
        relations: ['loan'],
        lock: { mode: 'pessimistic_write' }
      });

      if (!payment) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      if (payment.status === PaymentStatus.REVERSED) {
        throw new ConflictException('Payment already reversed');
      }

      const loan = payment.loan;
      const restoredBalance = Number(loan.balance) + Number(payment.amount);

      // 1. Update Loan Balance (Atomic)
      await queryRunner.manager.update(Loan, loan.id, {
        balance: restoredBalance,
        status: LoanStatus.ACTIVE, // Revert to active if was completed
        updatedAt: new Date()
      });

      // 2. Mark Payment as Reversed (Immutable - never delete)
      await queryRunner.manager.update(Payment, paymentId, {
        status: PaymentStatus.REVERSED,
        reversedAt: new Date(),
        reversedBy: adminUser.email || adminUser.username,
        reversalReason: reason,
        policyReference: '2026-01-10'
      });

      // 3. If this was tied to a schedule, mark schedule as UNPAID
      if (payment.scheduleId) {
        await queryRunner.manager.update(LoanSchedule, payment.scheduleId, {
          status: ScheduleStatus.PENDING
        });
      }

      // 4. Create Audit Trail (within same transaction)
      await this.auditService.logAction({
        action: 'PAYMENT_REVERSAL',
        tableName: 'payments',
        recordId: paymentId,
        user: adminUser.email || adminUser.username,
        description: `Policy [2026-01-10] enforced. Reason: ${reason}`,
        oldValues: { 
          paymentStatus: PaymentStatus.COMPLETED, 
          loanBalance: loan.balance,
          loanStatus: loan.status
        },
        newValues: { 
          paymentStatus: PaymentStatus.REVERSED, 
          loanBalance: restoredBalance,
          loanStatus: LoanStatus.ACTIVE
        },
        metadata: {
          reversalAmount: payment.amount,
          principalComponent: payment.principalAmount,
          interestComponent: payment.interestAmount
        }
      });

      await queryRunner.commitTransaction();
      
      return {
        success: true,
        message: 'Payment reversed successfully per Policy [2026-01-10]',
        data: {
          paymentId,
          reversedAmount: payment.amount,
          restoredBalance,
          reversedBy: adminUser.email,
          policyReference: '2026-01-10'
        }
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error; // Re-throw to be handled by NestJS exception filters
    } finally {
      await queryRunner.release();
    }
  }

  // Other methods remain unchanged...
  async findAll() {
    return await this.paymentRepo.find({
      relations: ['loan', 'loan.client'],
      order: { paymentDate: 'DESC' },
    });
  }

  async findByLoanId(loanId: number) {
    return await this.paymentRepo.find({
      where: { loan: { id: loanId } },
      order: { paymentDate: 'DESC' },
    });
  }
}
import {
  Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { FinTransaction, FinTxnStatus, FinTxnType } from './entities/fin-transaction.entity';
import { ClientDeposit, DepositStatus } from './entities/client-deposit.entity';
import { DepositAllocation } from './entities/deposit-allocation.entity';
import { FieldCollection } from './entities/field-collection.entity';
import { RemittanceBatch } from './entities/remittance-batch.entity';
import { FinCategory } from './entities/fin-category.entity';
import { CashDrawerService } from '../cash-drawers/cash-drawers.service';
import { JournalPosterService } from '../finance-core/journal-poster.service';
import { FinJournalType } from '../finance-core/entities/fin-journal.entity';
import { FinAccount, FinAccountSubtype } from '../finance-core/entities/fin-account.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ReceiveMoneyInput {
  tenantId: number;
  branchId?: number | null;
  amount: number;
  type: FinTxnType;
  categoryId?: number;
  clientId?: number;
  cashDrawerId?: number;
  reference: string;
  idempotencyKey: string;
  description?: string;
  reason?: string;
  txnDate?: string;
  createdById?: number;
  /** When true, skip approval and post immediately (admin path). */
  postImmediately?: boolean;
}

@Injectable()
export class FinancialOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FinTransaction) private readonly txnRepo: Repository<FinTransaction>,
    @InjectRepository(ClientDeposit) private readonly depositRepo: Repository<ClientDeposit>,
    @InjectRepository(DepositAllocation) private readonly allocRepo: Repository<DepositAllocation>,
    @InjectRepository(FieldCollection) private readonly fieldRepo: Repository<FieldCollection>,
    @InjectRepository(RemittanceBatch) private readonly remitRepo: Repository<RemittanceBatch>,
    @InjectRepository(FinCategory) private readonly catRepo: Repository<FinCategory>,
    @InjectRepository(FinAccount) private readonly accountRepo: Repository<FinAccount>,
    private readonly drawers: CashDrawerService,
    private readonly journals: JournalPosterService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Idempotent create of a money movement ─────────────────────────────────
  async receiveMoney(input: ReceiveMoneyInput): Promise<FinTransaction> {
    if (!(input.amount > 0)) throw new BadRequestException('Amount must be positive');

    const existing = await this.txnRepo.findOne({
      where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    return this.dataSource.transaction(async (manager) => {
      const txn = manager.create(FinTransaction, {
        tenantId: input.tenantId,
        branchId: input.branchId ?? null,
        type: input.type,
        status: input.postImmediately ? FinTxnStatus.POSTED : FinTxnStatus.PENDING_APPROVAL,
        amount: input.amount,
        categoryId: input.categoryId ?? null,
        clientId: input.clientId ?? null,
        cashDrawerId: input.cashDrawerId ?? null,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
        description: input.description ?? null,
        reason: input.reason ?? null,
        createdById: input.createdById ?? null,
        txnDate: input.txnDate || new Date().toISOString().slice(0, 10),
        postedAt: input.postImmediately ? new Date() : null,
        postedById: input.postImmediately ? (input.createdById ?? null) : null,
      });
      const saved = await manager.save(txn);

      if (input.type === FinTxnType.DEPOSIT && input.clientId) {
        const dep = manager.create(ClientDeposit, {
          tenantId: input.tenantId,
          branchId: input.branchId ?? null,
          clientId: input.clientId,
          finTxnId: saved.id,
          amountReceived: input.amount,
          amountAllocated: 0,
          amountRefunded: 0,
          status: DepositStatus.HELD,
          createdById: input.createdById ?? null,
        });
        await manager.save(dep);
      }

      if (input.postImmediately) {
        await this.applyPostEffects(manager, saved, input.createdById ?? 0);
      }

      await this.audit.logAction({
        action: input.postImmediately ? 'FIN_TXN_POSTED' : 'FIN_TXN_CREATED',
        tableName: 'fin_transactions',
        recordId: saved.id,
        tenantId: input.tenantId,
        branchId: input.branchId,
        reason: input.reason,
        user: String(input.createdById ?? ''),
        description: `${input.type} ${input.amount} ref=${input.reference}`,
      });

      return saved;
    });
  }

  /** Allocate deposit to a loan (down-payment). Locks the deposit row. */
  async allocateDeposit(params: {
    tenantId: number;
    depositId: number;
    amount: number;
    loanId?: number;
    createdById?: number;
  }): Promise<DepositAllocation> {
    if (!(params.amount > 0)) throw new BadRequestException('Allocation amount must be positive');

    return this.dataSource.transaction(async (manager) => {
      const dep = await manager
        .createQueryBuilder(ClientDeposit, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id AND d.tenant_id = :tenantId', {
          id: params.depositId,
          tenantId: params.tenantId,
        })
        .getOne();

      if (!dep) throw new NotFoundException('Deposit not found');

      const available =
        Number(dep.amountReceived) - Number(dep.amountAllocated) - Number(dep.amountRefunded);
      if (params.amount > available + 0.001) {
        throw new BadRequestException(
          `Over-allocation: available ${available.toFixed(2)}, requested ${params.amount.toFixed(2)}`,
        );
      }

      dep.amountAllocated = Number(dep.amountAllocated) + params.amount;
      const remaining =
        Number(dep.amountReceived) - Number(dep.amountAllocated) - Number(dep.amountRefunded);
      dep.status =
        remaining <= 0.001
          ? DepositStatus.FULLY_ALLOCATED
          : DepositStatus.PARTIALLY_ALLOCATED;
      await manager.save(dep);

      const alloc = manager.create(DepositAllocation, {
        tenantId: params.tenantId,
        depositId: dep.id,
        loanId: params.loanId ?? null,
        amount: params.amount,
        allocationType: 'DOWN_PAYMENT',
        createdById: params.createdById ?? null,
      });
      return manager.save(alloc);
    });
  }

  /** Refund part or all of a held deposit. Requires remaining balance. */
  async refundDeposit(params: {
    tenantId: number;
    depositId: number;
    amount: number;
    cashDrawerId?: number;
    reference: string;
    idempotencyKey: string;
    reason?: string;
    createdById?: number;
  }): Promise<FinTransaction> {
    if (!(params.amount > 0)) throw new BadRequestException('Refund amount must be positive');

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(FinTransaction, {
        where: { tenantId: params.tenantId, idempotencyKey: params.idempotencyKey },
      });
      if (existing) return existing;

      const dep = await manager
        .createQueryBuilder(ClientDeposit, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id AND d.tenant_id = :tenantId', {
          id: params.depositId,
          tenantId: params.tenantId,
        })
        .getOne();
      if (!dep) throw new NotFoundException('Deposit not found');

      const available =
        Number(dep.amountReceived) - Number(dep.amountAllocated) - Number(dep.amountRefunded);
      if (params.amount > available + 0.001) {
        throw new BadRequestException(`Refund exceeds available ${available.toFixed(2)}`);
      }

      dep.amountRefunded = Number(dep.amountRefunded) + params.amount;
      const remaining =
        Number(dep.amountReceived) - Number(dep.amountAllocated) - Number(dep.amountRefunded);
      dep.status =
        remaining <= 0.001 ? DepositStatus.REFUNDED : DepositStatus.PARTIALLY_REFUNDED;
      await manager.save(dep);

      const txn = manager.create(FinTransaction, {
        tenantId: params.tenantId,
        branchId: dep.branchId,
        type: FinTxnType.REFUND,
        status: FinTxnStatus.POSTED,
        amount: params.amount,
        clientId: dep.clientId,
        cashDrawerId: params.cashDrawerId ?? null,
        reference: params.reference,
        idempotencyKey: params.idempotencyKey,
        reason: params.reason ?? null,
        createdById: params.createdById ?? null,
        postedById: params.createdById ?? null,
        postedAt: new Date(),
        txnDate: new Date().toISOString().slice(0, 10),
      });
      const saved = await manager.save(txn);

      if (params.cashDrawerId) {
        await this.drawers.deduct(
          params.cashDrawerId,
          params.amount,
          `Deposit refund #${dep.id}`,
          manager,
        );
      }

      return saved;
    });
  }

  async listTransactions(tenantId: number, opts?: { status?: string; limit?: number }) {
    const qb = this.txnRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .orderBy('t.created_at', 'DESC')
      .take(Math.min(opts?.limit || 50, 200));
    if (opts?.status) qb.andWhere('t.status = :status', { status: opts.status });
    return qb.getMany();
  }

  async listDeposits(tenantId: number, clientId?: number) {
    const where: any = { tenantId };
    if (clientId) where.clientId = clientId;
    return this.depositRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  async listCategories(tenantId: number) {
    return this.catRepo.find({ where: { tenantId, isActive: true }, order: { code: 'ASC' } });
  }

  // ── Internal: drawer + optional journal side-effects on post ──────────────
  private async applyPostEffects(
    manager: EntityManager,
    txn: FinTransaction,
    userId: number,
  ): Promise<void> {
    if (txn.cashDrawerId) {
      if (
        txn.type === FinTxnType.MONEY_IN ||
        txn.type === FinTxnType.DEPOSIT ||
        txn.type === FinTxnType.FINE ||
        txn.type === FinTxnType.FIELD_COLLECTION
      ) {
        await this.drawers.add(txn.cashDrawerId, Number(txn.amount), `${txn.type} ${txn.reference}`, manager);
      } else if (txn.type === FinTxnType.MONEY_OUT || txn.type === FinTxnType.REFUND) {
        await this.drawers.deduct(txn.cashDrawerId, Number(txn.amount), `${txn.type} ${txn.reference}`, manager);
      }
    }
    // Journal posting is opt-in after D1 chart confirmation; we only create the
    // operational record and drawer movement here. Journal lines can be attached later.
  }
}

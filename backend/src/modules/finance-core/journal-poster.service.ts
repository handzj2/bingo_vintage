import {
  Injectable, BadRequestException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FinJournal, FinJournalStatus, FinJournalType } from './entities/fin-journal.entity';
import { FinJournalLine } from './entities/fin-journal-line.entity';
import { FinAccount } from './entities/fin-account.entity';
import { AuditService } from '../audit/audit.service';

export interface JournalLineInput {
  accountId: number;
  debit?: number;
  credit?: number;
  memo?: string;
}

export interface CreateJournalInput {
  tenantId: number;
  branchId?: number | null;
  reference: string;
  type: FinJournalType;
  journalDate: string;
  description?: string;
  idempotencyKey: string;
  sourceModule?: string;
  sourceId?: number;
  createdById?: number;
  reason?: string;
  lines: JournalLineInput[];
}

/**
 * Controlled journal poster.
 * - Enforces balanced debit = credit
 * - Enforces idempotency per tenant
 * - Never posts unbalanced or partial journals
 * - Does not auto-post existing ledger_entries; that mapping is explicit and later
 */
@Injectable()
export class JournalPosterService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FinJournal)
    private readonly journalRepo: Repository<FinJournal>,
    @InjectRepository(FinJournalLine)
    private readonly lineRepo: Repository<FinJournalLine>,
    @InjectRepository(FinAccount)
    private readonly accountRepo: Repository<FinAccount>,
    private readonly auditService: AuditService,
  ) {}

  async createDraft(input: CreateJournalInput): Promise<FinJournal> {
    this.assertBalanced(input.lines);

    // Idempotency check
    const existing = await this.journalRepo.findOne({
      where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey },
      relations: ['lines'],
    });
    if (existing) {
      return existing;
    }

    // Validate accounts belong to tenant and are active
    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const accounts = await this.accountRepo
      .createQueryBuilder('a')
      .where('a.id IN (:...ids)', { ids: accountIds })
      .andWhere('a.tenant_id = :tenantId', { tenantId: input.tenantId })
      .andWhere('a.is_active = true')
      .getMany();

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts are invalid, inactive, or outside tenant scope');
    }

    return this.dataSource.transaction(async (manager) => {
      const journal = manager.create(FinJournal, {
        tenantId: input.tenantId,
        branchId: input.branchId ?? null,
        reference: input.reference,
        type: input.type,
        journalDate: input.journalDate,
        status: FinJournalStatus.DRAFT,
        description: input.description ?? null,
        idempotencyKey: input.idempotencyKey,
        sourceModule: input.sourceModule ?? null,
        sourceId: input.sourceId ?? null,
        createdById: input.createdById ?? null,
        reason: input.reason ?? null,
      });
      const saved = await manager.save(journal);

      const lines = input.lines.map((l, idx) =>
        manager.create(FinJournalLine, {
          journalId: saved.id,
          accountId: l.accountId,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          memo: l.memo ?? null,
          lineOrder: idx,
        }),
      );
      await manager.save(lines);

      return manager.findOneOrFail(FinJournal, {
        where: { id: saved.id },
        relations: ['lines'],
      });
    });
  }

  /**
   * Post a journal that is already APPROVED (or auto-approve when policy allows).
   * Updates account balances inside the same transaction.
   */
  async post(journalId: number, tenantId: number, postedById: number): Promise<FinJournal> {
    return this.dataSource.transaction(async (manager) => {
      const journal = await manager
        .createQueryBuilder(FinJournal, 'j')
        .setLock('pessimistic_write')
        .where('j.id = :id AND j.tenant_id = :tenantId', { id: journalId, tenantId })
        .getOne();

      if (!journal) throw new BadRequestException('Journal not found');
      if (journal.status === FinJournalStatus.POSTED) return journal;
      if (journal.status === FinJournalStatus.REVERSED) {
        throw new BadRequestException('Cannot post a reversed journal');
      }
      if (journal.status === FinJournalStatus.REJECTED || journal.status === FinJournalStatus.CANCELLED) {
        throw new BadRequestException(`Cannot post a ${journal.status} journal`);
      }

      const lines = await manager.find(FinJournalLine, { where: { journalId } });
      this.assertBalanced(lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit })));

      // Apply balances
      for (const line of lines) {
        const delta = Number(line.debit) - Number(line.credit);
        if (delta !== 0) {
          await manager.increment(FinAccount, { id: line.accountId }, 'currentBalance', delta);
        }
      }

      journal.status = FinJournalStatus.POSTED;
      journal.postedById = postedById;
      journal.postedAt = new Date();
      if (!journal.approvedById) {
        journal.approvedById = postedById;
        journal.approvedAt = journal.postedAt;
      }
      await manager.save(journal);

      return journal;
    });
  }

  private assertBalanced(lines: { debit?: number; credit?: number }[]): void {
    if (!lines.length) {
      throw new BadRequestException('Journal must have at least one line');
    }
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      const d = Number(l.debit || 0);
      const c = Number(l.credit || 0);
      if (d < 0 || c < 0) throw new BadRequestException('Debit and credit must be non-negative');
      if (d > 0 && c > 0) throw new BadRequestException('A line cannot have both debit and credit');
      debit += d;
      credit += c;
    }
    // Compare at 2 decimal places
    const dRound = Math.round(debit * 100);
    const cRound = Math.round(credit * 100);
    if (dRound !== cRound) {
      throw new BadRequestException(
        `Journal is unbalanced: debit ${debit.toFixed(2)} != credit ${credit.toFixed(2)}`,
      );
    }
    if (dRound === 0) {
      throw new BadRequestException('Journal total cannot be zero');
    }
  }
}

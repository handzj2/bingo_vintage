import {
  Injectable, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RecoveryCase, RecoveryCaseStatus } from './entities/recovery-case.entity';
import { RecoveryInspection } from './entities/recovery-inspection.entity';
import { RecoverySettlement } from './entities/recovery-settlement.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { Bike, BikeStatus } from '../bikes/entities/bike.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RecoveryCase) private readonly caseRepo: Repository<RecoveryCase>,
    @InjectRepository(RecoveryInspection) private readonly inspRepo: Repository<RecoveryInspection>,
    @InjectRepository(RecoverySettlement) private readonly settRepo: Repository<RecoverySettlement>,
    @InjectRepository(Loan) private readonly loanRepo: Repository<Loan>,
    @InjectRepository(Bike) private readonly bikeRepo: Repository<Bike>,
    private readonly audit: AuditService,
  ) {}

  async openCase(params: {
    tenantId: number;
    branchId?: number | null;
    loanId: number;
    caseType?: string;
    notes?: string;
    openedById?: number;
  }): Promise<RecoveryCase> {
    const loan = await this.loanRepo.findOne({
      where: { id: params.loanId, tenantId: params.tenantId },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if ([LoanStatus.CANCELLED, LoanStatus.COMPLETED].includes(loan.status)) {
      throw new BadRequestException(`Cannot open recovery on loan status ${loan.status}`);
    }

    const existing = await this.caseRepo.findOne({
      where: { tenantId: params.tenantId, loanId: params.loanId, status: RecoveryCaseStatus.OPEN as any },
    });
    // Allow multiple historical cases; block only another OPEN
    const open = await this.caseRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.loan_id = :loanId', {
        tenantId: params.tenantId,
        loanId: params.loanId,
      })
      .andWhere('c.status NOT IN (:...done)', {
        done: [RecoveryCaseStatus.CLOSED, RecoveryCaseStatus.CANCELLED],
      })
      .getOne();
    if (open) throw new ConflictException(`Active recovery case #${open.id} already exists for this loan`);

    const c = this.caseRepo.create({
      tenantId: params.tenantId,
      branchId: params.branchId ?? null,
      loanId: loan.id,
      clientId: (loan as any).clientId ?? (loan as any).client_id,
      bikeId: (loan as any).bikeId ?? (loan as any).bike_id ?? null,
      status: RecoveryCaseStatus.OPEN,
      caseType: params.caseType || 'REPOSSESSION',
      notes: params.notes ?? null,
      openedById: params.openedById ?? null,
    });
    const saved = await this.caseRepo.save(c);

    await this.audit.logAction({
      action: 'RECOVERY_CASE_OPENED',
      tableName: 'recovery_cases',
      recordId: saved.id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      user: String(params.openedById ?? ''),
      description: `Loan ${params.loanId}`,
    });
    return saved;
  }

  async authorise(params: {
    tenantId: number;
    caseId: number;
    notes?: string;
    userId?: number;
  }): Promise<RecoveryCase> {
    return this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(RecoveryCase, {
        where: { id: params.caseId, tenantId: params.tenantId },
      });
      if (!c) throw new NotFoundException('Recovery case not found');
      if (c.status !== RecoveryCaseStatus.OPEN) {
        throw new BadRequestException(`Case status ${c.status} cannot be authorised`);
      }
      c.status = RecoveryCaseStatus.AUTHORISED;
      c.authorisedById = params.userId ?? null;
      c.authorisedAt = new Date();
      c.authorisationNotes = params.notes ?? null;
      await manager.save(c);

      // Move bike to RECOVERY_PENDING if present (custody trail)
      if (c.bikeId) {
        const bike = await manager.findOne(Bike, { where: { id: c.bikeId } });
        if (bike && bike.status === BikeStatus.LOANED) {
          bike.status = BikeStatus.RECOVERY_PENDING as any;
          await manager.save(bike);
        }
      }

      await this.audit.logAction({
        action: 'RECOVERY_AUTHORISED',
        tableName: 'recovery_cases',
        recordId: c.id,
        tenantId: params.tenantId,
        user: String(params.userId ?? ''),
        reason: params.notes,
      });
      return c;
    });
  }

  async takeCustody(params: {
    tenantId: number;
    caseId: number;
    userId?: number;
  }): Promise<RecoveryCase> {
    return this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(RecoveryCase, {
        where: { id: params.caseId, tenantId: params.tenantId },
      });
      if (!c) throw new NotFoundException('Recovery case not found');
      if (![RecoveryCaseStatus.AUTHORISED, RecoveryCaseStatus.OPEN].includes(c.status as any)) {
        throw new BadRequestException(`Cannot take custody from status ${c.status}`);
      }
      c.status = RecoveryCaseStatus.IN_CUSTODY;
      await manager.save(c);

      if (c.bikeId) {
        const bike = await manager.findOne(Bike, { where: { id: c.bikeId } });
        if (bike) {
          bike.status = BikeStatus.RECOVERED as any;
          await manager.save(bike);
        }
      }
      return c;
    });
  }

  async recordInspection(params: {
    tenantId: number;
    caseId: number;
    conditionNotes?: string;
    estimatedValue?: number;
    odometer?: number;
    photosCount?: number;
    userId?: number;
  }): Promise<RecoveryInspection> {
    return this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(RecoveryCase, {
        where: { id: params.caseId, tenantId: params.tenantId },
      });
      if (!c) throw new NotFoundException('Recovery case not found');

      const insp = manager.create(RecoveryInspection, {
        tenantId: params.tenantId,
        recoveryCaseId: c.id,
        inspectedById: params.userId ?? null,
        conditionNotes: params.conditionNotes ?? null,
        estimatedValue: params.estimatedValue ?? null,
        odometer: params.odometer ?? null,
        photosCount: params.photosCount ?? 0,
      });
      const saved = await manager.save(insp);

      c.status = RecoveryCaseStatus.INSPECTED;
      await manager.save(c);

      if (c.bikeId) {
        const bike = await manager.findOne(Bike, { where: { id: c.bikeId } });
        if (bike) {
          bike.status = BikeStatus.UNDER_INSPECTION as any;
          await manager.save(bike);
        }
      }
      return saved;
    });
  }

  /**
   * Prepare settlement statement (D7/D8).
   * Snapshots outstanding balances. Does NOT write off, offset, or alter the loan.
   * Shows both accrued-to-now and frozen-at-recovery views.
   */
  async prepareSettlement(params: {
    tenantId: number;
    caseId: number;
    bikeEstimatedValue?: number;
    notes?: string;
    userId?: number;
  }): Promise<RecoverySettlement> {
    const c = await this.caseRepo.findOne({
      where: { id: params.caseId, tenantId: params.tenantId },
    });
    if (!c) throw new NotFoundException('Recovery case not found');

    const loan = await this.loanRepo.findOne({
      where: { id: c.loanId, tenantId: params.tenantId },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    const principal = Number((loan as any).balance ?? (loan as any).principalAmount ?? 0);
    // Accrued view: use current loan fields if present; otherwise principal only
    const accruedInterest = Number((loan as any).accruedInterest ?? (loan as any).interest_accrued ?? 0);
    const accruedPenalties = Number((loan as any).totalArrears ?? (loan as any).total_arrears ?? 0);
    const totalOutstanding = principal + accruedInterest + Math.max(0, accruedPenalties - principal);

    // Frozen view (D8): freeze interest/penalties at recovery open time approximation
    // Without a dedicated accrual engine we snapshot current figures as both views
    // and leave accountant to confirm before any posting.
    const frozenInterest = accruedInterest;
    const frozenPenalties = accruedPenalties;
    const frozenTotal = principal + frozenInterest;

    const sett = this.settRepo.create({
      tenantId: params.tenantId,
      recoveryCaseId: c.id,
      loanId: loan.id,
      principalOutstanding: principal,
      accruedInterest,
      accruedPenalties,
      totalOutstanding: principal + accruedInterest,
      frozenInterest,
      frozenPenalties,
      frozenTotal,
      bikeEstimatedValue: params.bikeEstimatedValue ?? null,
      offsetApplied: 0,      // D7: never auto-offset
      writeOffAmount: 0,     // D7: never auto write-off
      status: 'DRAFT',
      notes: params.notes ??
        'Report only. No write-off or valuation offset applied. Accountant confirmation required before any posting.',
      preparedById: params.userId ?? null,
      preparedAt: new Date(),
    });
    const saved = await this.settRepo.save(sett);

    c.status = RecoveryCaseStatus.SETTLEMENT_PREPARED;
    await this.caseRepo.save(c);

    await this.audit.logAction({
      action: 'RECOVERY_SETTLEMENT_PREPARED',
      tableName: 'recovery_settlements',
      recordId: saved.id,
      tenantId: params.tenantId,
      user: String(params.userId ?? ''),
      description: `Loan ${loan.id} outstanding snapshot; no write-off applied`,
    });

    return saved;
  }

  async closeCase(params: {
    tenantId: number;
    caseId: number;
    reason?: string;
    userId?: number;
  }): Promise<RecoveryCase> {
    const c = await this.caseRepo.findOne({
      where: { id: params.caseId, tenantId: params.tenantId },
    });
    if (!c) throw new NotFoundException('Recovery case not found');
    c.status = RecoveryCaseStatus.CLOSED;
    c.closedAt = new Date();
    c.closedById = params.userId ?? null;
    c.closeReason = params.reason ?? null;
    await this.caseRepo.save(c);

    // Bike → RECOVERY_CLEARED (available for reassignment via normal reservation flow)
    if (c.bikeId) {
      const bike = await this.bikeRepo.findOne({ where: { id: c.bikeId } });
      if (bike) {
        bike.status = BikeStatus.RECOVERY_CLEARED as any;
        await this.bikeRepo.save(bike);
      }
    }
    return c;
  }

  async list(tenantId: number, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.caseRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  async getCase(id: number, tenantId: number) {
    const c = await this.caseRepo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Recovery case not found');
    const inspections = await this.inspRepo.find({
      where: { recoveryCaseId: id },
      order: { createdAt: 'DESC' },
    });
    const settlements = await this.settRepo.find({
      where: { recoveryCaseId: id },
      order: { createdAt: 'DESC' },
    });
    return { case: c, inspections, settlements };
  }
}

import {
  Injectable, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Handover } from './entities/handover.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { Bike, BikeStatus } from '../bikes/entities/bike.entity';
import { BikeStatusService } from '../bikes/bike-status.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(Handover) private readonly handRepo: Repository<Handover>,
    @InjectRepository(Loan) private readonly loanRepo: Repository<Loan>,
    @InjectRepository(Bike) private readonly bikeRepo: Repository<Bike>,
    private readonly bikeStatus: BikeStatusService,
    private readonly audit: AuditService,
  ) {}

  async create(params: {
    tenantId: number;
    branchId?: number | null;
    clientId: number;
    agreedPrice: number;
    depositRequired?: number;
    notes?: string;
    createdById?: number;
  }): Promise<Reservation> {
    const r = this.resRepo.create({
      tenantId: params.tenantId,
      branchId: params.branchId ?? null,
      clientId: params.clientId,
      agreedPrice: params.agreedPrice,
      depositRequired: params.depositRequired ?? 0,
      depositReceived: 0,
      status: ReservationStatus.ACTIVE,
      notes: params.notes ?? null,
      createdById: params.createdById ?? null,
    });
    const saved = await this.resRepo.save(r);
    await this.audit.logAction({
      action: 'RESERVATION_CREATED',
      tableName: 'reservations',
      recordId: saved.id,
      tenantId: params.tenantId,
      branchId: params.branchId,
      user: String(params.createdById ?? ''),
      description: `Client ${params.clientId} reservation`,
    });
    return saved;
  }

  async list(tenantId: number, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.resRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  async getOne(id: number, tenantId: number) {
    const r = await this.resRepo.findOne({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  /**
   * Link a financing proposal: create loan in APPROVED_PENDING_DELIVERY.
   * Does NOT generate schedule rows and does NOT mark bike LOANED.
   */
  async attachFinancing(params: {
    tenantId: number;
    reservationId: number;
    loanId: number;
    userId?: number;
  }): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const res = await manager.findOne(Reservation, {
        where: { id: params.reservationId, tenantId: params.tenantId },
      });
      if (!res) throw new NotFoundException('Reservation not found');
      if (res.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Reservation is cancelled');
      }

      const loan = await manager.findOne(Loan, {
        where: { id: params.loanId, tenantId: params.tenantId },
      });
      if (!loan) throw new NotFoundException('Loan not found');

      // Force pending-delivery status; never ACTIVE here
      loan.status = LoanStatus.APPROVED_PENDING_DELIVERY as any;
      await manager.save(loan);

      res.loanId = loan.id;
      res.status = ReservationStatus.FINANCING_APPROVED;
      await manager.save(res);

      await this.audit.logAction({
        action: 'RESERVATION_FINANCING_ATTACHED',
        tableName: 'reservations',
        recordId: res.id,
        tenantId: params.tenantId,
        user: String(params.userId ?? ''),
        description: `Loan ${loan.id} set APPROVED_PENDING_DELIVERY`,
      });

      return res;
    });
  }

  /**
   * Allocate a bike to the reservation. Locks the bike row; sets RESERVED.
   */
  async allocateBike(params: {
    tenantId: number;
    reservationId: number;
    bikeId: number;
    userId?: number;
  }): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const res = await manager
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id AND r.tenant_id = :tenantId', {
          id: params.reservationId,
          tenantId: params.tenantId,
        })
        .getOne();
      if (!res) throw new NotFoundException('Reservation not found');
      if (res.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Reservation is cancelled');
      }
      if (res.bikeId && res.bikeId !== params.bikeId) {
        throw new ConflictException('Reservation already has a different bike allocated');
      }

      const bike = await manager
        .createQueryBuilder(Bike, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id AND b.tenant_id = :tenantId', {
          id: params.bikeId,
          tenantId: params.tenantId,
        })
        .getOne();
      if (!bike) throw new NotFoundException('Bike not found');
      if (bike.status !== BikeStatus.AVAILABLE && bike.status !== BikeStatus.RESERVED) {
        throw new ConflictException(`Bike is not available (status=${bike.status})`);
      }

      // Another active reservation already holding this bike?
      const other = await manager
        .createQueryBuilder(Reservation, 'r')
        .where('r.bike_id = :bikeId', { bikeId: params.bikeId })
        .andWhere('r.tenant_id = :tenantId', { tenantId: params.tenantId })
        .andWhere('r.id != :id', { id: res.id })
        .andWhere('r.status NOT IN (:...done)', {
          done: [ReservationStatus.CANCELLED, ReservationStatus.HANDED_OVER],
        })
        .getOne();
      if (other) {
        throw new ConflictException(`Bike already reserved on reservation #${other.id}`);
      }

      res.bikeId = bike.id;
      res.status = ReservationStatus.BIKE_ALLOCATED;
      await manager.save(res);

      if (bike.status === BikeStatus.AVAILABLE) {
        bike.status = BikeStatus.RESERVED;
        await manager.save(bike);
      }

      return res;
    });
  }

  /**
   * Handover + activate: unique handover per loan, generate activation by
   * moving loan PENDING_DELIVERY → ACTIVE. Schedule generation is delegated
   * to the existing loan activation path (caller must ensure schedule exists
   * or trigger loans service separately). Bike → LOANED.
   */
  async handoverAndActivate(params: {
    tenantId: number;
    reservationId: number;
    userId?: number;
    notes?: string;
  }): Promise<{ reservation: Reservation; handover: Handover; loan: Loan }> {
    return this.dataSource.transaction(async (manager) => {
      const res = await manager
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id AND r.tenant_id = :tenantId', {
          id: params.reservationId,
          tenantId: params.tenantId,
        })
        .getOne();
      if (!res) throw new NotFoundException('Reservation not found');
      if (!res.loanId) throw new BadRequestException('No financing loan attached');
      if (!res.bikeId) throw new BadRequestException('No bike allocated');
      if (res.status === ReservationStatus.HANDED_OVER) {
        throw new ConflictException('Already handed over');
      }
      if (res.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Reservation is cancelled');
      }

      const loan = await manager
        .createQueryBuilder(Loan, 'l')
        .setLock('pessimistic_write')
        .where('l.id = :id AND l.tenant_id = :tenantId', {
          id: res.loanId,
          tenantId: params.tenantId,
        })
        .getOne();
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== (LoanStatus.APPROVED_PENDING_DELIVERY as any) &&
          loan.status !== LoanStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Loan status ${loan.status} cannot be activated via handover`,
        );
      }

      // Unique handover per loan
      const existingHand = await manager.findOne(Handover, {
        where: { loanId: loan.id },
      });
      if (existingHand) throw new ConflictException('Handover already exists for this loan');

      const bike = await manager
        .createQueryBuilder(Bike, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id', { id: res.bikeId })
        .getOne();
      if (!bike) throw new NotFoundException('Bike not found');

      loan.status = LoanStatus.ACTIVE;
      // Link bike on loan if not already
      if (!(loan as any).bikeId && !(loan as any).bike_id) {
        (loan as any).bikeId = bike.id;
      }
      await manager.save(loan);

      bike.status = BikeStatus.LOANED;
      (bike as any).assigned_client_id = res.clientId;
      await manager.save(bike);

      const hand = manager.create(Handover, {
        tenantId: params.tenantId,
        reservationId: res.id,
        loanId: loan.id,
        bikeId: bike.id,
        handedOverBy: params.userId ?? null,
        notes: params.notes ?? null,
      });
      const savedHand = await manager.save(hand);

      res.status = ReservationStatus.HANDED_OVER;
      await manager.save(res);

      await this.audit.logAction({
        action: 'RESERVATION_HANDOVER_ACTIVATED',
        tableName: 'reservations',
        recordId: res.id,
        tenantId: params.tenantId,
        user: String(params.userId ?? ''),
        description: `Loan ${loan.id} activated; bike ${bike.id} LOANED`,
      });

      return { reservation: res, handover: savedHand, loan };
    });
  }

  async cancel(params: {
    tenantId: number;
    reservationId: number;
    reason?: string;
    userId?: number;
  }): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const res = await manager.findOne(Reservation, {
        where: { id: params.reservationId, tenantId: params.tenantId },
      });
      if (!res) throw new NotFoundException('Reservation not found');
      if (res.status === ReservationStatus.HANDED_OVER) {
        throw new BadRequestException('Cannot cancel after handover');
      }
      if (res.status === ReservationStatus.CANCELLED) return res;

      // Release bike if allocated
      if (res.bikeId) {
        const bike = await manager.findOne(Bike, { where: { id: res.bikeId } });
        if (bike && bike.status === BikeStatus.RESERVED) {
          bike.status = BikeStatus.AVAILABLE;
          await manager.save(bike);
        }
      }

      // Cancel pending-delivery loan if present
      if (res.loanId) {
        const loan = await manager.findOne(Loan, { where: { id: res.loanId } });
        if (loan && loan.status === (LoanStatus.APPROVED_PENDING_DELIVERY as any)) {
          loan.status = LoanStatus.CANCELLED;
          await manager.save(loan);
        }
      }

      res.status = ReservationStatus.CANCELLED;
      res.cancelledAt = new Date();
      res.cancelledById = params.userId ?? null;
      res.cancelReason = params.reason ?? null;
      await manager.save(res);
      return res;
    });
  }
}

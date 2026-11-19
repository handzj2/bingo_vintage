import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Bike, BikeStatus } from './entities/bike.entity';
import { BikeStatusHistory } from './entities/bike-status-history.entity';

const ALLOWED: Record<string, string[]> = {
  AVAILABLE: ['RESERVED', 'MAINTENANCE', 'SOLD'],
  RESERVED: ['AVAILABLE', 'LOANED'],
  LOANED: ['RECOVERY_PENDING', 'AVAILABLE'],
  RECOVERY_PENDING: ['RECOVERED'],
  RECOVERED: ['UNDER_INSPECTION', 'UNDER_REPAIR', 'RECOVERY_CLEARED'],
  UNDER_INSPECTION: ['UNDER_REPAIR', 'RECOVERY_CLEARED'],
  UNDER_REPAIR: ['RECOVERY_CLEARED'],
  RECOVERY_CLEARED: ['AVAILABLE'],
  MAINTENANCE: ['AVAILABLE'],
  SOLD: [],
};

@Injectable()
export class BikeStatusService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Bike)
    private readonly bikeRepo: Repository<Bike>,
    @InjectRepository(BikeStatusHistory)
    private readonly historyRepo: Repository<BikeStatusHistory>,
  ) {}

  async transition(params: {
    bikeId: number;
    tenantId: number;
    toStatus: BikeStatus | string;
    changedById?: number | null;
    reason?: string;
    referenceType?: string;
    referenceId?: number;
  }): Promise<Bike> {
    return this.dataSource.transaction(async (manager) => {
      const bike = await manager
        .createQueryBuilder(Bike, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id AND b.tenant_id = :tenantId', {
          id: params.bikeId,
          tenantId: params.tenantId,
        })
        .getOne();

      if (!bike) throw new BadRequestException('Bike not found');

      const from = bike.status;
      const to = params.toStatus as string;
      const allowed = ALLOWED[from] || [];
      if (!allowed.includes(to)) {
        throw new BadRequestException(`Invalid bike status transition ${from} → ${to}`);
      }

      bike.status = to as BikeStatus;
      await manager.save(bike);

      const hist = manager.create(BikeStatusHistory, {
        tenantId: params.tenantId,
        bikeId: bike.id,
        fromStatus: from,
        toStatus: to,
        changedById: params.changedById ?? null,
        reason: params.reason ?? null,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
      });
      await manager.save(hist);

      return bike;
    });
  }
}

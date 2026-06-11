import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bike, BikeStatus } from './entities/bike.entity';
import { assertAdmin, assertRole } from '../../common/helpers/role-helper';

/**
 * BikesService — Phase 2
 *
 * CHANGES FROM ORIGINAL
 * ─────────────────────
 * update()     line 29: !['admin','manager'].includes(user.role)  → assertRole()
 * hardDelete() line 43: user.role !== 'admin'                     → assertAdmin()
 *
 * All other methods unchanged.
 */
@Injectable()
export class BikesService {
  constructor(
    @InjectRepository(Bike)
    private bikeRepo: Repository<Bike>,
  ) {}

  // Phase 2.3: tenant-scoped — no bike data leaks across tenants
  async findAll(tenantId?: number) {
    const where: any = tenantId ? { tenantId } : {};
    return this.bikeRepo.find({ where, order: { created_at: 'DESC' } });
  }

  async findOne(id: number) {
    const bike = await this.bikeRepo.findOneBy({ id });
    if (!bike) throw new NotFoundException(`Bike with ID ${id} not found`);
    return bike;
  }

  async create(data: Partial<Bike>) {
    const bike = this.bikeRepo.create(data);
    return this.bikeRepo.save(bike);
  }

  async update(id: number, data: Partial<Bike>, user: any) {
    // Phase 2: assertRole() replaces raw user.role array check
    assertRole(user, ['admin', 'manager'], 'Only admin or manager can update bikes');

    const bike = await this.findOne(id);
    // Never change status through this endpoint — use dedicated status endpoints
    delete (data as any).status;
    delete (data as any).assigned_client_id;
    Object.assign(bike, data);
    return this.bikeRepo.save(bike);
  }

  async hardDelete(id: number, user: any) {
    // Phase 2: assertAdmin() replaces raw user.role check
    assertAdmin(user, 'Only admin can delete bikes');

    const bike = await this.findOne(id);
    if (bike.status === BikeStatus.LOANED) {
      throw new BadRequestException(
        'Cannot delete a bike that is currently on loan. Settle the loan first.',
      );
    }
    await this.bikeRepo.delete(id);
    return {
      success: true,
      message: `Bike "${bike.model}" (${bike.frame_number}) permanently deleted`,
    };
  }

  async setMaintenance(id: number) {
    const bike = await this.findOne(id);
    if (bike.status === BikeStatus.LOANED) {
      throw new BadRequestException('Cannot set a loaned bike to maintenance');
    }
    bike.status = BikeStatus.MAINTENANCE;
    return this.bikeRepo.save(bike);
  }

  async updateBikeStatus(id: number, status: BikeStatus) {
    return this.bikeRepo.update(id, { status });
  }
}

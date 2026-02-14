import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bike, BikeStatus } from './entities/bike.entity';

@Injectable()
export class BikesService {
  constructor(
    @InjectRepository(Bike)
    private bikeRepo: Repository<Bike>,
  ) {}

  async findAll() {
    return await this.bikeRepo.find({ order: { created_at: 'DESC' } });
  }

  // ADD THIS: Fixes the 'Property findOne does not exist' error
  async findOne(id: number) {
    const bike = await this.bikeRepo.findOneBy({ id });
    if (!bike) throw new NotFoundException(`Bike with ID ${id} not found`);
    return bike;
  }

  async create(data: Partial<Bike>) {
    const bike = this.bikeRepo.create(data);
    return await this.bikeRepo.save(bike);
  }

  async setMaintenance(id: number) {
    const bike = await this.findOne(id); // Uses the new findOne logic
    if (bike.status === BikeStatus.LOANED) {
      throw new BadRequestException('Cannot set a loaned bike to maintenance');
    }
    bike.status = BikeStatus.MAINTENANCE;
    return await this.bikeRepo.save(bike);
  }

  // ADD to your existing BikesService
  async updateBikeStatus(id: number, status: BikeStatus) {
    return await this.bikeRepo.update(id, { status });
  }
}
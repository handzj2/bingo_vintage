import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOneBy({ id });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const existing = await this.tenantRepo.findOneBy({ slug: data.slug });
    if (existing) throw new ConflictException(`Tenant slug "${data.slug}" already exists`);
    const tenant = this.tenantRepo.create(data);
    return this.tenantRepo.save(tenant);
  }

  async update(id: number, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, data);
    return this.tenantRepo.save(tenant);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.findOne(id);
    await this.tenantRepo.delete(id);
    return { success: true };
  }
}

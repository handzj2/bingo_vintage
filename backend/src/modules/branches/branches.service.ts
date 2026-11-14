import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async findAll(tenantId?: number): Promise<Branch[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.branchRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Branch> {
    const branch = await this.branchRepo.findOneBy({ id });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  // Only these fields may be written from the API (blocks id / tenantId overwrite via PATCH).
  private pick(data: any): Partial<Branch> {
    const out: any = {};
    for (const k of ['name', 'location', 'managerName', 'contactPhone', 'isActive']) {
      if (data && data[k] !== undefined) out[k] = data[k];
    }
    if (out.name !== undefined) {
      out.name = String(out.name).trim();
      if (out.name.length < 2) throw new BadRequestException('Branch name is required');
    }
    return out;
  }

  async create(data: Partial<Branch>, callerTenantId?: number): Promise<Branch> {
    const fields: any = this.pick(data);
    if (!fields.name) throw new BadRequestException('Branch name is required');
    const tenantId = callerTenantId ?? (data as any)?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant is required');
    const branch = this.branchRepo.create({ ...fields, tenantId });
    return this.branchRepo.save(branch);
  }

  async update(id: number, data: Partial<Branch>, callerTenantId?: number): Promise<Branch> {
    const branch = await this.findOne(id);
    // Phase 3: prevent cross-tenant branch modification
    if (callerTenantId && branch.tenantId && branch.tenantId !== callerTenantId) {
      throw new ForbiddenException('You do not have permission to modify this branch');
    }
    Object.assign(branch, this.pick(data));
    return this.branchRepo.save(branch);
  }

  async remove(id: number, callerTenantId?: number): Promise<{ success: boolean }> {
    const branch = await this.findOne(id);
    // Phase 3: prevent cross-tenant branch deletion
    if (callerTenantId && branch.tenantId && branch.tenantId !== callerTenantId) {
      throw new ForbiddenException('You do not have permission to delete this branch');
    }
    try {
      await this.branchRepo.delete(id);
    } catch (e: any) {
      // 23503 = foreign_key_violation: users, drawers, loans or payments still point at it.
      if (e?.code === '23503' || e?.driverError?.code === '23503') {
        throw new ConflictException('This branch has users, drawers, loans or payments and cannot be deleted. Deactivate it instead.');
      }
      throw e;
    }
    return { success: true };
  }
}

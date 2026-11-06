import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async create(data: Partial<Branch>): Promise<Branch> {
    const branch = this.branchRepo.create(data);
    return this.branchRepo.save(branch);
  }

  async update(id: number, data: Partial<Branch>, callerTenantId?: number): Promise<Branch> {
    const branch = await this.findOne(id);
    // Phase 3: prevent cross-tenant branch modification
    if (callerTenantId && branch.tenantId && branch.tenantId !== callerTenantId) {
      throw new ForbiddenException('You do not have permission to modify this branch');
    }
    Object.assign(branch, data);
    return this.branchRepo.save(branch);
  }

  async remove(id: number, callerTenantId?: number): Promise<{ success: boolean }> {
    const branch = await this.findOne(id);
    // Phase 3: prevent cross-tenant branch deletion
    if (callerTenantId && branch.tenantId && branch.tenantId !== callerTenantId) {
      throw new ForbiddenException('You do not have permission to delete this branch');
    }
    await this.branchRepo.delete(id);
    return { success: true };
  }
}

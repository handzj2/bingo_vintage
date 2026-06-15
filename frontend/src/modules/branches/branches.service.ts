import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: number, data: Partial<Branch>): Promise<Branch> {
    const branch = await this.findOne(id);
    Object.assign(branch, data);
    return this.branchRepo.save(branch);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.findOne(id);
    await this.branchRepo.delete(id);
    return { success: true };
  }
}

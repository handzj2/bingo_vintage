import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanProduct } from './entities/loan-product.entity';

@Injectable()
export class LoanProductsService {
  constructor(
    @InjectRepository(LoanProduct)
    private readonly productRepo: Repository<LoanProduct>,
  ) {}

  async findAll(tenantId?: number): Promise<LoanProduct[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.productRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<LoanProduct> {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException(`Loan product ${id} not found`);
    return product;
  }

  async create(data: Partial<LoanProduct>): Promise<LoanProduct> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async update(id: number, data: Partial<LoanProduct>): Promise<LoanProduct> {
    const product = await this.findOne(id);
    Object.assign(product, data);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    await this.findOne(id);
    await this.productRepo.delete(id);
    return { success: true };
  }
}

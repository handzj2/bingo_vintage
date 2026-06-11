import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or } from 'typeorm';
import { Permission, PermissionAction } from './entities/permission.entity';

export interface CreatePermissionDto {
  code: string;
  name: string;
  resource: string;
  action: PermissionAction;
  description?: string;
}

/**
 * PermissionsService
 *
 * Returns system-wide permissions (tenant_id IS NULL) PLUS
 * any tenant-scoped permissions for the current tenant.
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  async findAll(tenantId?: number): Promise<Permission[]> {
    // Return global + tenant-specific permissions
    if (tenantId) {
      return this.permRepo.find({
        where: [{ tenantId: IsNull() }, { tenantId }],
        order: { resource: 'ASC', action: 'ASC' },
      });
    }
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async findByCode(code: string): Promise<Permission> {
    const p = await this.permRepo.findOne({ where: { code } });
    if (!p) throw new NotFoundException(`Permission '${code}' not found`);
    return p;
  }

  async create(dto: CreatePermissionDto, tenantId?: number): Promise<Permission> {
    const p = this.permRepo.create({ ...dto, tenantId: tenantId ?? null });
    return this.permRepo.save(p);
  }

  async remove(code: string): Promise<void> {
    await this.permRepo.delete({ code });
  }
}

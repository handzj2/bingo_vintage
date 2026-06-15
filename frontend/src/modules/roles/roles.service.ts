import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';

export interface CreateRoleDto {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface AssignPermissionDto {
  permissionCode: string;
  grantedBy?: number;
}

/**
 * RolesService
 *
 * All operations are scoped to tenantId to enforce multi-tenant isolation.
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────

  async findAll(tenantId: number): Promise<Role[]> {
    return this.roleRepo.find({
      where: { tenantId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id, tenantId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    return role;
  }

  async findByName(name: string, tenantId: number): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { name, tenantId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  async create(dto: CreateRoleDto, tenantId: number): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name, tenantId } });
    if (existing) {
      throw new ConflictException(`Role '${dto.name}' already exists for this tenant`);
    }
    const role = this.roleRepo.create({
      name:        dto.name,
      description: dto.description,
      isDefault:   dto.isDefault ?? false,
      tenantId,
    });
    return this.roleRepo.save(role);
  }

  async update(id: number, dto: Partial<CreateRoleDto>, tenantId: number): Promise<Role> {
    const role = await this.findOne(id, tenantId);
    if (dto.name !== undefined)        role.name        = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.isDefault !== undefined)   role.isDefault   = dto.isDefault;
    return this.roleRepo.save(role);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const role = await this.findOne(id, tenantId);
    await this.roleRepo.remove(role);
  }

  // ── Permission assignment ─────────────────────────────────────

  /**
   * Grant a permission to a role.
   * Idempotent — calling again with the same code is a no-op.
   */
  async assignPermission(
    roleId: number,
    dto: AssignPermissionDto,
    tenantId: number,
  ): Promise<RolePermission> {
    await this.findOne(roleId, tenantId); // confirms role belongs to tenant

    const existing = await this.rpRepo.findOne({
      where: { roleId, permissionCode: dto.permissionCode },
    });
    if (existing) return existing;

    const rp = this.rpRepo.create({
      roleId,
      permissionCode: dto.permissionCode,
      grantedBy:      dto.grantedBy ?? null,
      tenantId,
    });
    return this.rpRepo.save(rp);
  }

  /**
   * Revoke a single permission from a role.
   */
  async revokePermission(
    roleId: number,
    permissionCode: string,
    tenantId: number,
  ): Promise<void> {
    await this.findOne(roleId, tenantId);
    await this.rpRepo.delete({ roleId, permissionCode });
  }

  /**
   * Replace ALL permissions for a role atomically.
   * Useful for "save role permissions" from the UI.
   */
  async setPermissions(
    roleId: number,
    codes: string[],
    tenantId: number,
    grantedBy?: number,
  ): Promise<RolePermission[]> {
    await this.findOne(roleId, tenantId);

    // Delete existing
    await this.rpRepo.delete({ roleId });

    // Insert new set
    const rows = codes.map((code) =>
      this.rpRepo.create({
        roleId,
        permissionCode: code,
        grantedBy:      grantedBy ?? null,
        tenantId,
      }),
    );
    return this.rpRepo.save(rows);
  }
}

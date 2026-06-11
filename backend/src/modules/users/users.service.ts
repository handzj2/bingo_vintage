import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { sanitiseDto } from '../../common/utils/sanitise';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(rawDto: CreateUserDto): Promise<User> {
    const createUserDto = sanitiseDto(rawDto);
    const existing = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });
    if (existing) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Phase 4 — tenant_id is mandatory. Never silently default to 1.
    // A missing tenant_id means the caller did not supply it — fail loudly
    // so the API consumer knows what is required.
    const rawTenantId = createUserDto.tenant_id;
    if (!rawTenantId) {
      throw new BadRequestException(
        'tenant_id is required when creating a user',
      );
    }
    const tenantId = rawTenantId;
    const branchId = createUserDto.branch_id ?? null;

    const tenantRows: any[] = await this.usersRepository.manager.query(
      `SELECT id FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    );
    if (tenantRows.length === 0) {
      throw new BadRequestException(`Tenant #${tenantId} does not exist`);
    }

    if (branchId !== null) {
      const branchRows: any[] = await this.usersRepository.manager.query(
        `SELECT id FROM branches WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [branchId, tenantId],
      );
      if (branchRows.length === 0) {
        throw new BadRequestException(
          `Branch #${branchId} does not exist or does not belong to tenant #${tenantId}`,
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = new User();
    user.username = createUserDto.username;
    user.email = createUserDto.email;
    user.fullName = createUserDto.full_name ?? null;
    user.password_hash = hashedPassword;
    user.tenantId = tenantId;   // Phase 4: validated — never null
    user.branchId = branchId;   // Phase 4: null when not supplied (branch is optional)

    if (createUserDto.roleId) {
      user.roleId = createUserDto.roleId;
    } else {
      // Fallback to a default role (e.g., 'user')
      const defaultRoleId = await this.resolveRoleId('user', user.tenantId);
      if (!defaultRoleId) {
        throw new BadRequestException('Default role "user" not found. Please provide a roleId.');
      }
      user.roleId = defaultRoleId;
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['roleRelation'] });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roleRelation'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async update(id: number, rawDto: UpdateUserDto): Promise<User> {
    const updateUserDto = sanitiseDto(rawDto);
    const user = await this.findOne(id);

    if (updateUserDto.full_name) user.fullName = updateUserDto.full_name;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.roleId) user.roleId = updateUserDto.roleId;

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.findOne(id);
    const valid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
    return { success: true, message: 'Password changed successfully' };
  }

  async deactivate(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = false;
    return this.usersRepository.save(user);
  }

  async activate(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = true;
    return this.usersRepository.save(user);
  }

  async updatePermissions(
    id: number,
    permissions: Record<string, boolean>,
  ): Promise<User> {
    const user = await this.findOne(id);
    user.permissions = permissions;
    return this.usersRepository.save(user);
  }

  async getStats(): Promise<any> {
    const total = await this.usersRepository.count();
    const active = await this.usersRepository.count({ where: { isActive: true } });

    // Count admins by joining roleRelation and filtering by name
    const adminCount = await this.usersRepository
      .createQueryBuilder('user')
      .innerJoin('user.roleRelation', 'role')
      .where('role.name = :role', { role: 'admin' })
      .getCount();

    return {
      total,
      active,
      inactive: total - active,
      admins: adminCount,
      regularUsers: total - adminCount,
    };
  }

  async validateUser(identifier: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  private async resolveRoleId(roleName: string, tenantId: number): Promise<number | null> {
    const rows = await this.usersRepository.manager.query(
      `SELECT id FROM roles WHERE name = $1 AND tenant_id = $2 LIMIT 1`,
      [roleName, tenantId],
    );
    return rows?.[0]?.id ?? null;
  }
}
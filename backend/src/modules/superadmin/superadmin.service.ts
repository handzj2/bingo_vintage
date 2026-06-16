import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tenant }    from '../tenants/entities/tenant.entity';
import { User }      from '../users/entities/user.entity';
import { Audit }     from '../audit/entities/audit-log.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ImpersonateDto }  from './dto/impersonate.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User)   private userRepo:   Repository<User>,
    @InjectRepository(Audit)  private auditRepo:  Repository<Audit>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  // ── List all tenants with user counts ────────────────────────────────────
  async listTenants() {
    return this.dataSource.query(`
      SELECT
        t.id, t.name, t.slug, t.is_active,
        t.contact_email, t.created_at,
        COUNT(DISTINCT u.id)::int AS user_count,
        COUNT(DISTINCT l.id)::int AS loan_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      LEFT JOIN loans l ON l.tenant_id = t.id
      WHERE t.id != 0
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
  }

  // ── Get single tenant with users ─────────────────────────────────────────
  async getTenant(id: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const users = await this.userRepo.find({
      where: { tenantId: id },
      select: ['id', 'username', 'email', 'isActive', 'createdAt'],
    });
    return { ...tenant, users };
  }

  // ── Create tenant + seed roles + admin user ───────────────────────────────
  async createTenant(dto: CreateTenantDto, superAdminId: number) {
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" already taken`);

    return this.dataSource.transaction(async em => {
      // 1. Create tenant
      const tenant = em.create(Tenant, {
        name:         dto.name,
        slug:         dto.slug,
        description:  dto.description,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        isActive:     true,
      });
      const savedTenant = await em.save(Tenant, tenant);

      // 2. Seed standard roles
      const roleNames = ['admin', 'manager', 'cashier', 'loan_officer'];
      const roleIds: Record<string, number> = {};
      for (const name of roleNames) {
        const res = await em.query(
          `INSERT INTO roles (name, tenant_id, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
          [name, savedTenant.id],
        );
        roleIds[name] = res[0].id;
      }

      // 3. Seed default Main Branch
      const branchResult = await em.query(
        `INSERT INTO branches (tenant_id, name, location, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id`,
        [savedTenant.id, dto.branchName || 'Main Branch', dto.branchLocation || ''],
      );
      const branchId = branchResult[0].id;

      // Seed additional branches if provided
      if (dto.additionalBranches && dto.additionalBranches.length > 0) {
        for (const b of dto.additionalBranches) {
          await em.query(
            `INSERT INTO branches (tenant_id, name, location, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, true, NOW(), NOW())`,
            [savedTenant.id, b.name, b.location || ''],
          );
        }
      }

      // 4. Create tenant admin user
      const hash = await bcrypt.hash(dto.adminPassword, 10);
      await em.query(
        `INSERT INTO users
           (username, email, password_hash, full_name, role_id, tenant_id,
            is_active, must_change_password, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,true,true,NOW(),NOW())`,
        [dto.adminUsername, dto.adminEmail, hash,
         `${dto.name} Admin`, roleIds['admin'], savedTenant.id],
      );

      // 4. Audit log
      await em.save(Audit, em.create(Audit, {
        action:      'SUPERADMIN_CREATE_TENANT',
        tableName:   'tenants',
        recordId:    savedTenant.id,
        user:        String(superAdminId),
        description: `Superadmin created tenant: ${dto.name}`,
        newValues:   JSON.stringify({ name: dto.name, slug: dto.slug }),
      }));

      return {
        tenant: savedTenant,
        message: `Tenant created. Admin user "${dto.adminUsername}" must change password on first login.`,
      };
    });
  }

  // ── Toggle tenant active status ───────────────────────────────────────────
  async setTenantStatus(id: number, isActive: boolean, superAdminId: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.tenantRepo.update(id, { isActive });
    await this.auditRepo.save(this.auditRepo.create({
      action:      isActive ? 'SUPERADMIN_ACTIVATE_TENANT' : 'SUPERADMIN_DEACTIVATE_TENANT',
      tableName:   'tenants',
      recordId:    id,
      user:        String(superAdminId),
      description: `Tenant ${tenant.name} ${isActive ? 'activated' : 'deactivated'}`,
    }));
    return { success: true, isActive };
  }

  // ── List users across all tenants ─────────────────────────────────────────
  async listAllUsers(search?: string) {
    const where = search
      ? `AND (u.username ILIKE $1 OR u.email ILIKE $1)`
      : '';
    const params = search ? [`%${search}%`] : [];
    return this.dataSource.query(`
      SELECT u.id, u.username, u.email, u.is_active,
             u.created_at, t.name AS tenant_name, r.name AS role_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN roles   r ON r.id = u.role_id
      WHERE u.tenant_id != 0 ${where}
      ORDER BY u.created_at DESC
      LIMIT 200
    `, params);
  }

  // ── Impersonate a user ────────────────────────────────────────────────────
  async impersonate(dto: ImpersonateDto, superAdminId: number) {
    const user = await this.userRepo.findOne({
      where: { id: dto.userId, tenantId: dto.tenantId },
    });
    if (!user) throw new NotFoundException('User not found in that tenant');

    const token = this.jwtService.sign(
      {
        sub:          user.id,
        tenantId:     user.tenantId,
        impersonator: superAdminId,
        scope:        'impersonation',
      },
      { expiresIn: '15m' },
    );

    await this.auditRepo.save(this.auditRepo.create({
      action:      'SUPERADMIN_IMPERSONATE',
      tableName:   'users',
      recordId:    dto.userId,
      user:        String(superAdminId),
      description: `Impersonation of user ${user.username} (tenant ${dto.tenantId}). Reason: ${dto.reason ?? 'not provided'}`,
    }));

    return { token, username: user.username, expiresIn: '15m' };
  }

  // ── Branch management ────────────────────────────────────────────────────
  async listTenantBranches(tenantId: number) {
    return this.dataSource.query(`
      SELECT id, name, location, is_active, manager_name, contact_phone, created_at
      FROM branches WHERE tenant_id = $1 ORDER BY name ASC
    `, [tenantId]);
  }

  async createBranch(tenantId: number, data: {
    name: string; location?: string; managerName?: string; contactPhone?: string;
  }, superAdminId: number) {
    const res = await this.dataSource.query(
      `INSERT INTO branches (tenant_id, name, location, manager_name, contact_phone, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW()) RETURNING *`,
      [tenantId, data.name, data.location ?? '', data.managerName ?? '', data.contactPhone ?? ''],
    );
    await this.auditRepo.save(this.auditRepo.create({
      action: 'SUPERADMIN_CREATE_BRANCH', tableName: 'branches',
      recordId: res[0].id, user: String(superAdminId),
      description: `Branch "${data.name}" created for tenant ${tenantId}`,
    }));
    return res[0];
  }

  async toggleBranch(branchId: number, isActive: boolean, superAdminId: number) {
    await this.dataSource.query(
      `UPDATE branches SET is_active=$1, updated_at=NOW() WHERE id=$2`,
      [isActive, branchId],
    );
    await this.auditRepo.save(this.auditRepo.create({
      action: isActive ? 'SUPERADMIN_ACTIVATE_BRANCH' : 'SUPERADMIN_DEACTIVATE_BRANCH',
      tableName: 'branches', recordId: branchId, user: String(superAdminId),
      description: `Branch ${branchId} ${isActive ? 'activated' : 'deactivated'}`,
    }));
    return { success: true, isActive };
  }

  // ── Audit log viewer ──────────────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [rows, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take:  limit,
      skip:  offset,
    });
    return { rows, total, page, limit };
  }

  // ── Platform stats ────────────────────────────────────────────────────────
  async getStats() {
    const [[tenants], [users], [loans], [activeLoans]] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*)::int AS count FROM tenants WHERE id != 0 AND is_active = true`),
      this.dataSource.query(`SELECT COUNT(*)::int AS count FROM users WHERE tenant_id != 0`),
      this.dataSource.query(`SELECT COUNT(*)::int AS count FROM loans`),
      this.dataSource.query(`SELECT COUNT(*)::int AS count FROM loans WHERE status = 'ACTIVE'`),
    ]);
    return {
      tenants:     tenants.count,
      users:       users.count,
      totalLoans:  loans.count,
      activeLoans: activeLoans.count,
    };
  }
}

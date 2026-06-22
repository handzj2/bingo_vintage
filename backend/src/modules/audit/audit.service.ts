import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audit } from './entities/audit-log.entity';

interface LogActionParams {
  action: string;
  tableName?: string;
  recordId?: number;
  user?: string;
  ipAddress?: string;
  description?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;  // ✅ Fixed: Supports administrative reversal reasons
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private auditRepo: Repository<Audit>,
  ) {}

  // ✅ ADD THIS METHOD to fix the error
  async findAll(tenantId?: number) {
    // Audit logs were never tenant-scoped — any logged-in admin could see
    // every tenant's activity (including platform-level SUPERADMIN_* actions
    // with tenant_id = NULL). tenantId is now required for regular tenant
    // admins; passing undefined (superadmin) returns everything, matching
    // their platform-wide view.
    return await this.auditRepo.find({
      where: tenantId ? { tenantId } : {},
      order: { createdAt: 'DESC' }, // Show newest logs first
    });
  }

  async logAction(params: LogActionParams) {
    const entry = this.auditRepo.create({
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      user: params.user,
      ipAddress: params.ipAddress,
      description: params.description,
      oldValues: typeof params.oldValues === 'string' ? params.oldValues : JSON.stringify(params.oldValues),
      newValues: typeof params.newValues === 'string' ? params.newValues : JSON.stringify(params.newValues),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null, // ✅ Store metadata if provided
    });
    return await this.auditRepo.save(entry);
  }

  // Keep existing getLogs method for backward compatibility
  async getLogs() {
    return await this.findAll(); // Now just calls the new findAll method
  }
}
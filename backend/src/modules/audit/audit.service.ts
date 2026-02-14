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
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(Audit)
    private auditRepo: Repository<Audit>,
  ) {}

  // ✅ ADD THIS METHOD to fix the error
  async findAll() {
    return await this.auditRepo.find({
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
    });
    return await this.auditRepo.save(entry);
  }

  // Keep existing getLogs method for backward compatibility
  async getLogs() {
    return await this.findAll(); // Now just calls the new findAll method
  }
}
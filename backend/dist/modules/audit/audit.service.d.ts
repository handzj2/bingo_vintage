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
export declare class AuditService {
    private auditRepo;
    constructor(auditRepo: Repository<Audit>);
    findAll(): Promise<Audit[]>;
    logAction(params: LogActionParams): Promise<Audit>;
    getLogs(): Promise<Audit[]>;
}
export {};

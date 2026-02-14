import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from './entities/audit-log.entity'; // ✅ This should be audit-log.entity if that's your filename
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller'; 

@Module({
  imports: [TypeOrmModule.forFeature([Audit])],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
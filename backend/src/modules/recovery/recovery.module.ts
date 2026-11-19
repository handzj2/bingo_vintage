import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecoveryCase } from './entities/recovery-case.entity';
import { RecoveryInspection } from './entities/recovery-inspection.entity';
import { RecoverySettlement } from './entities/recovery-settlement.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { RecoveryService } from './recovery.service';
import { RecoveryController } from './recovery.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecoveryCase,
      RecoveryInspection,
      RecoverySettlement,
      Loan,
      Bike,
    ]),
    AuditModule,
  ],
  providers: [RecoveryService],
  controllers: [RecoveryController],
  exports: [RecoveryService],
})
export class RecoveryModule {}

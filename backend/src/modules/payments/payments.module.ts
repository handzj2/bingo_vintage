import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../loans/entities/schedule.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module'; // 👈 Import AuditModule

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment, 
      Loan,
      LoanSchedule
    ]),
    AuthModule,
    AuditModule, // 👈 Add this import
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
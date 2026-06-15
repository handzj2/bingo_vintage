import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Payment } from '../payments/entities/payment.entity';
import { Loan } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Loan, LoanSchedule])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Loan } from '../loans/entities/loan.entity';
import { Client } from '../clients/entities/client.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity'; // ✅ Import the unified entity

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan, 
      Client, 
      Payment, 
      Bike, 
      LoanSchedule  // ✅ Added LoanSchedule
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
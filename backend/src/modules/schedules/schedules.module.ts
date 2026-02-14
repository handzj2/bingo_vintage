import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { LoanSchedule } from './entities/schedule.entity';
import { Loan } from '../loans/entities/loan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanSchedule, Loan]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
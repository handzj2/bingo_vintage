import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { Client } from '../clients/entities/client.entity';
import { LoanSchedule } from './entities/schedule.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { BikesModule } from '../bikes/bikes.module';
import { SettingsModule } from '../settings/settings.module'; // 👈 Import the SettingsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, Client, LoanSchedule, Bike]),
    BikesModule,
    SettingsModule, // 👈 Add SettingsModule to imports
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService]
})
export class LoansModule {}
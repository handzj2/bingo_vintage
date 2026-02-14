import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Client } from '../clients/entities/client.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Bike } from '../bikes/entities/bike.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Loan, Payment, Bike]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
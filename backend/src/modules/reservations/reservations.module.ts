import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Handover } from './entities/handover.entity';
import { Loan } from '../loans/entities/loan.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { BikesModule } from '../bikes/bikes.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Handover, Loan, Bike]),
    BikesModule,
    AuditModule,
  ],
  providers: [ReservationsService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}

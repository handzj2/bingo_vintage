import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BikesController } from './bikes.controller';
import { BikesService } from './bikes.service';
import { Bike } from './entities/bike.entity';
import { BikeStatusHistory } from './entities/bike-status-history.entity';
import { BikeStatusService } from './bike-status.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bike, BikeStatusHistory])],
  controllers: [BikesController],
  providers: [BikesService, BikeStatusService],
  exports: [TypeOrmModule, BikesService, BikeStatusService], // ✅ Export TypeOrmModule
})
export class BikesModule {}
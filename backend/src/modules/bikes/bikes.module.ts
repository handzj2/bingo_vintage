import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BikesController } from './bikes.controller';
import { BikesService } from './bikes.service';
import { Bike } from './entities/bike.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bike])],
  controllers: [BikesController],
  providers: [BikesService],
  exports: [TypeOrmModule, BikesService], // ✅ Export TypeOrmModule
})
export class BikesModule {}
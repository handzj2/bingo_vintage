import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProduct } from './entities/loan-product.entity';
import { LoanProductsService } from './loan-products.service';
import { LoanProductsController } from './loan-products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoanProduct])],
  controllers: [LoanProductsController],
  providers: [LoanProductsService],
  exports: [LoanProductsService],
})
export class LoanProductsModule {}

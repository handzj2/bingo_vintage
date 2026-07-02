import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProduct } from './entities/loan-product.entity';
import { LoanProductsService } from './loan-products.service';
import { LoanProductsController } from './loan-products.controller';
import { LoanProductTemplateService } from './loan-product-template.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanProduct])],
  controllers: [LoanProductsController],
  providers: [LoanProductsService, LoanProductTemplateService],
  exports: [LoanProductsService, LoanProductTemplateService],
})
export class LoanProductsModule {}

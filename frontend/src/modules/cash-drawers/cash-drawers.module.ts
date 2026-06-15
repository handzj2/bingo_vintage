import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashDrawer } from './entities/cash-drawer.entity';
import { CashDrawerService } from './cash-drawers.service';
import { CashDrawerController } from './cash-drawers.controller';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashDrawer, Payment, Expense])],
  controllers: [CashDrawerController],
  providers: [CashDrawerService],
  exports: [CashDrawerService],
})
export class CashDrawersModule {}
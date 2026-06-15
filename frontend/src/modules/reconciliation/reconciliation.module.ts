import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reconciliation } from './entities/reconciliation.entity';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { CashDrawersModule } from '../cash-drawers/cash-drawers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reconciliation, CashDrawer, Payment, Expense]),
    CashDrawersModule,
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
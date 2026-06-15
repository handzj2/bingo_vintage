import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';

/**
 * FIX: DashboardModule was empty — no imports, no controllers, no providers.
 * The DashboardController and DashboardService existed on disk but were never
 * registered, so GET /dashboard/summary always returned 404.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, Expense])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

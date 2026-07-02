/**
 * LoansModule  (UPDATED for enterprise engines)
 *
 * Changes from original:
 *   • Added ArrearsCalculationJob to providers (Arrears Aggregation Engine)
 *   • Added LedgerModule to imports (so LoansService can inject LedgerService)
 *   • Added LoanProductsModule (so LoansService can load tenant-owned
 *     LoanProduct rows and source loan behavior from them — see
 *     applyForLoan()'s loanProductId branch)
 *
 * All original imports, controllers, and exports unchanged.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { Client } from '../clients/entities/client.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { BikesModule } from '../bikes/bikes.module';
import { SettingsModule } from '../settings/settings.module';
import { SchedulesModule } from '../schedules/schedules.module';

// ── New imports for enterprise engines ────────────────────────
import { ArrearsCalculationJob } from './jobs/arrears-calculation.job';
import { LedgerModule }          from '../ledger/ledger.module';
import { LoanProductsModule }    from '../loan-products/loan-products.module';
import { LoanCalculatorRegistry, loanCalculatorProviders } from './calculators/loan-calculator.registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, Client, LoanSchedule, Bike]),
    BikesModule,
    SettingsModule,
    SchedulesModule,
    LedgerModule,        // provides LedgerService for LoansService (disbursement entries)
    LoanProductsModule,  // provides LoanProductsService for product-driven loan creation
  ],
  controllers: [LoansController],
  providers: [
    LoansService,
    ArrearsCalculationJob,  // Arrears Aggregation Engine — runs at 02:00
    LoanCalculatorRegistry,
    ...loanCalculatorProviders,
  ],
  exports: [LoansService],
})
export class LoansModule {}
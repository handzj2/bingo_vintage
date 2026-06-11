/**
 * SchedulesModule  (UPDATED for enterprise engines)
 *
 * Changes from original:
 *   • Added OverdueScheduleJob to providers (was missing)
 *   • Added PenaltyCalculationJob to providers (new engine)
 *   • Added SettingsModule and LedgerModule to imports (required by PenaltyJob)
 *
 * Original providers/exports (SchedulesService, SchedulesController) unchanged.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { LoanSchedule } from './entities/schedule.entity';
import { LoanAlert } from './entities/alert.entity';
import { Loan } from '../loans/entities/loan.entity';

// ── New imports for enterprise engines ────────────────────────
import { OverdueScheduleJob }     from './jobs/overdue-schedule.job';
import { PenaltyCalculationJob }  from './jobs/penalty-calculation.job';
import { SettingsModule }         from '../settings/settings.module';
import { LedgerModule }           from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanSchedule, LoanAlert, Loan]),
    SettingsModule,   // provides SettingsService for PenaltyCalculationJob
    LedgerModule,     // provides LedgerService for PenaltyCalculationJob
  ],
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    OverdueScheduleJob,     // Overdue Detection Engine  — runs at 00:00
    PenaltyCalculationJob,  // Penalty Calculation Engine — runs at 01:00
  ],
  exports: [SchedulesService],
})
export class SchedulesModule {}
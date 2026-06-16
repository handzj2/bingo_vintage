// patch 2026-06-16: removed ::schedule_status_enum and ::loan_status_enum casts
/**
 * OverdueScheduleJob  —  Overdue Detection Engine
 *
 * Runs every day at MIDNIGHT (00:00) and promotes schedule rows from
 * PENDING → OVERDUE when their due_date has passed.
 *
 * ── Design notes ───────────────────────────────────────────────────────────
 * • Raw SQL UPDATE — avoids loading rows into Node.js RAM and bypasses the
 *   TypeORM decimal-zeroing bug that affects repo.save() on loan_schedules.
 * • RETURNING clause — lets us extract the affected loan IDs in one round-trip,
 *   so we can bulk-promote those loans to DELINQUENT without a second SELECT.
 * • today is used as a strict less-than (<) boundary — a schedule due today
 *   is never prematurely marked overdue during the same calendar day.
 * • Errors are caught/logged and swallowed — a bad nightly run must never
 *   crash the application process.
 *
 * ── Module registration ────────────────────────────────────────────────────
 * This job is already registered in SchedulesModule (schedules.module.ts).
 * No changes to the module file are needed unless you created a fresh project.
 *
 *   providers: [SchedulesService, OverdueScheduleJob]
 *
 * ScheduleModule.forRoot() is already in AppModule.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanSchedule } from '../entities/schedule.entity';

interface FlippedRow {
  id:      number;
  loan_id: number;
}

@Injectable()
export class OverdueScheduleJob {
  private readonly logger = new Logger(OverdueScheduleJob.name);

  constructor(
    @InjectRepository(LoanSchedule)
    private readonly scheduleRepo: Repository<LoanSchedule>,
  ) {}

  /**
   * markOverdueSchedules()
   *
   * Scheduled: 00:00 every day via @nestjs/schedule.
   *
   * Step 1 — PENDING → OVERDUE where due_date < TODAY
   * Step 2 — Promote affected loans ACTIVE → DELINQUENT (bulk, one UPDATE)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueSchedules(): Promise<void> {
    this.logger.log('Overdue detection job started');

    try {
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

      // ── Step 1: Flip PENDING → OVERDUE ──────────────────────────────────
      const flipped: FlippedRow[] = await this.scheduleRepo.manager.query(
        `UPDATE loan_schedules
            SET status     = 'OVERDUE',
                updated_at = NOW()
          WHERE status   = 'PENDING'
            AND due_date  < $1::date
          RETURNING id, loan_id`,
        [today],
      );

      if (flipped.length === 0) {
        this.logger.log('Overdue detection complete — no schedules required flipping');
        return;
      }

      this.logger.log(`Flipped ${flipped.length} schedule(s) to OVERDUE`);

      // ── Step 2: Promote affected loans to DELINQUENT ────────────────────
      const loanIds = [...new Set(flipped.map((r) => r.loan_id))];

      await this.scheduleRepo.manager.query(
        `UPDATE loans
            SET status     = 'DELINQUENT',
                updated_at = NOW()
          WHERE id         = ANY($1)
            AND status     = 'ACTIVE'`,
        [loanIds],
      );

      this.logger.log(
        `Overdue detection complete — ` +
        `${flipped.length} schedule(s) flipped, ${loanIds.length} loan(s) evaluated`,
      );
    } catch (err) {
      this.logger.error(
        'Overdue detection job failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}

/**
 * PenaltyCalculationJob  —  Penalty / Arrears Calculation Engine
 *
 * Runs every day at 01:00 AM and accumulates daily penalty charges on all
 * OVERDUE schedule rows.
 *
 * ── Formula ─────────────────────────────────────────────────────────────────
 *   dailyRate        = LATE_FEE_DAILY setting (UGX, default 1,000/day)
 *   chargePeriod     = calendar days since last_penalty_applied (or due_date)
 *   additionalCharge = dailyRate × chargePeriod
 *   penalty_amount  += additionalCharge   (accumulates, never resets)
 *   overdue_days     = floor( (today − due_date) / 86,400,000 ms )
 *
 * ── Idempotency ──────────────────────────────────────────────────────────────
 *   last_penalty_applied tracks the last date charges were recorded.
 *   Running twice on the same day is safe — newDays will be 0 on the
 *   second run because last_penalty_applied = today.
 *
 * ── Batching ─────────────────────────────────────────────────────────────────
 *   Processes BATCH_SIZE (100) rows at a time using OFFSET pagination.
 *   Never loads the entire table into Node.js memory.
 *
 * ── Ledger integration ───────────────────────────────────────────────────────
 *   After each row update, calls ledgerService.recordPenalty().
 *   Ledger failures are swallowed inside LedgerService — they never abort
 *   the penalty write itself.
 *
 * ── Module registration ───────────────────────────────────────────────────────
 *   See schedules.module.ts (updated version) for the full registration.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanSchedule } from '../entities/schedule.entity';
import { SettingsService } from '../../settings/settings.service';
import { LedgerService } from '../../ledger/ledger.service';

const BATCH_SIZE = 100;

interface PenaltyRow {
  id:                   number;
  loan_id:              number;
  client_id:            number;
  due_date:             string;
  penalty_amount:       string;
  last_penalty_applied: string | null;
}

@Injectable()
export class PenaltyCalculationJob {
  private readonly logger = new Logger(PenaltyCalculationJob.name);

  constructor(
    @InjectRepository(LoanSchedule)
    private readonly scheduleRepo: Repository<LoanSchedule>,

    private readonly settingsService: SettingsService,
    private readonly ledgerService:   LedgerService,
  ) {}

  /**
   * calculatePenalties()
   *
   * Scheduled: 01:00 AM daily — runs AFTER OverdueScheduleJob (00:00)
   * so every row is already in OVERDUE status before we charge penalties.
   */
  @Cron('0 1 * * *')
  async calculatePenalties(): Promise<void> {
    this.logger.log('Penalty calculation job started');

    try {
      const dailyRate = await this.settingsService.getNumber('LATE_FEE_DAILY', 1000);

      if (dailyRate <= 0) {
        this.logger.warn('LATE_FEE_DAILY ≤ 0 — penalty job skipped');
        return;
      }

      const today      = new Date();
      const todayStr   = today.toISOString().slice(0, 10);
      const MS_PER_DAY = 86_400_000;

      let offset       = 0;
      let totalRows    = 0;
      let totalCharged = 0;

      while (true) {
        // Join schedules→loans to pick up client_id in one query
        const rows: PenaltyRow[] = await this.scheduleRepo.manager.query(
          `SELECT
              ls.id,
              ls.loan_id,
              l.client_id,
              ls.due_date::text,
              ls.penalty_amount,
              ls.last_penalty_applied::text
             FROM loan_schedules ls
             JOIN loans l ON l.id = ls.loan_id
            WHERE ls.status = 'OVERDUE'
              AND (ls.last_penalty_applied IS NULL
                   OR ls.last_penalty_applied < $1::date)
            ORDER BY ls.id ASC
            LIMIT $2 OFFSET $3`,
          [todayStr, BATCH_SIZE, offset],
        );

        if (rows.length === 0) break;

        for (const row of rows) {
          const dueDate    = new Date(row.due_date);
          const lastCharge = row.last_penalty_applied
            ? new Date(row.last_penalty_applied)
            : null;

          // Grace: first charge starts the day AFTER due_date.
          // Subsequent charges start the day after the last charge date.
          const chargeFrom = lastCharge
            ? new Date(lastCharge.getTime() + MS_PER_DAY)
            : new Date(dueDate.getTime()    + MS_PER_DAY);

          const newDays = Math.floor(
            (today.getTime() - chargeFrom.getTime()) / MS_PER_DAY,
          );

          if (newDays <= 0) continue;

          const additionalCharge = parseFloat((dailyRate * newDays).toFixed(2));
          const newPenalty       = parseFloat(
            (parseFloat(row.penalty_amount ?? '0') + additionalCharge).toFixed(2),
          );
          const overdueDays      = Math.floor(
            (today.getTime() - dueDate.getTime()) / MS_PER_DAY,
          );

          // Raw SQL — never repo.save() on schedule rows
          await this.scheduleRepo.manager.query(
            `UPDATE loan_schedules
                SET penalty_amount       = $1,
                    overdue_days         = $2,
                    last_penalty_applied = $3::date,
                    updated_at           = NOW()
              WHERE id = $4`,
            [newPenalty, overdueDays, todayStr, row.id],
          );

          // Record to ledger (swallowed on failure)
          await this.ledgerService.recordPenalty(
            row.loan_id,
            row.client_id,
            additionalCharge,
            String(row.id),
          );

          totalCharged += additionalCharge;
        }

        totalRows += rows.length;
        offset    += BATCH_SIZE;
        this.logger.debug(`Penalty batch — offset=${offset} rows=${rows.length}`);
      }

      this.logger.log(
        `Penalty job complete — rows=${totalRows} | ` +
        `UGX charged=${totalCharged.toLocaleString()} | rate=${dailyRate}/day`,
      );
    } catch (err) {
      this.logger.error(
        'Penalty calculation job failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}

/**
 * PenaltyCalculationJob — Penalty / Arrears Calculation Engine
 *
 * Option A: Per-tenant mode
 * Runs every day at 01:00 AM. For each tenant that has overdue schedules,
 * reads that tenant's own LATE_FEE_DAILY setting and charges accordingly.
 * This prevents one tenant's rate from affecting another's loans.
 *
 * Legacy loans (tenant_id IS NULL): charged using the global fallback rate.
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

  @Cron('0 1 * * *')
  async calculatePenalties(): Promise<void> {
    this.logger.log('Penalty calculation job started — per-tenant mode');

    try {
      const today      = new Date();
      const todayStr   = today.toISOString().slice(0, 10);
      const MS_PER_DAY = 86_400_000;

      // ── Step 1: Find all tenant buckets with overdue work today ─────────────
      // Includes NULL tenant_id (legacy loans) as a separate bucket
      const buckets: { id: number | null }[] = await this.scheduleRepo.manager.query(
        `SELECT DISTINCT l.tenant_id AS id
           FROM loan_schedules ls
           JOIN loans l ON l.id = ls.loan_id
          WHERE ls.status = 'OVERDUE'
            AND (ls.last_penalty_applied IS NULL
                 OR ls.last_penalty_applied < $1::date)`,
        [todayStr],
      );

      if (buckets.length === 0) {
        this.logger.log('No overdue schedules today — job complete');
        return;
      }

      // Log how many legacy (null tenant) loans exist
      const nullBucket = buckets.filter(b => b.id === null);
      if (nullBucket.length > 0) {
        this.logger.warn(
          `${nullBucket.length} overdue schedule(s) have no tenant_id — ` +
          `will be charged using global LATE_FEE_DAILY rate`,
        );
      }

      let grandTotalRows    = 0;
      let grandTotalCharged = 0;

      // ── Step 2: Process each tenant bucket with its own rate ─────────────────
      for (const bucket of buckets) {
        const tenantId = bucket.id;

        // Resolve rate: tenant-specific if available, global fallback otherwise
        const dailyRate = tenantId != null
          ? await this.settingsService.getNumberForTenant('LATE_FEE_DAILY', tenantId, 1000)
          : await this.settingsService.getNumber('LATE_FEE_DAILY', 1000);

        if (dailyRate <= 0) {
          this.logger.warn(
            `LATE_FEE_DAILY ≤ 0 for tenant ${tenantId ?? 'global'} — skipping bucket`,
          );
          continue;
        }

        let offset        = 0;
        let bucketRows    = 0;
        let bucketCharged = 0;

        // ── Step 3: Batch through this tenant's overdue schedules ─────────────
        while (true) {
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
                AND l.tenant_id ${tenantId != null ? '= $1' : 'IS NULL'}
                AND (ls.last_penalty_applied IS NULL
                     OR ls.last_penalty_applied < ${tenantId != null ? '$2' : '$1'}::date)
              ORDER BY ls.id ASC
              LIMIT ${tenantId != null ? '$3' : '$2'} OFFSET ${tenantId != null ? '$4' : '$3'}`,
            tenantId != null
              ? [tenantId, todayStr, BATCH_SIZE, offset]
              : [todayStr, BATCH_SIZE, offset],
          );

          if (rows.length === 0) break;

          for (const row of rows) {
            const dueDate    = new Date(row.due_date);
            const lastCharge = row.last_penalty_applied
              ? new Date(row.last_penalty_applied)
              : null;

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
            const overdueDays = Math.floor(
              (today.getTime() - dueDate.getTime()) / MS_PER_DAY,
            );

            await this.scheduleRepo.manager.query(
              `UPDATE loan_schedules
                  SET penalty_amount       = $1,
                      overdue_days         = $2,
                      last_penalty_applied = $3::date,
                      updated_at           = NOW()
                WHERE id = $4`,
              [newPenalty, overdueDays, todayStr, row.id],
            );

            await this.ledgerService.recordPenalty(
              row.loan_id,
              row.client_id,
              additionalCharge,
              String(row.id),
            );

            bucketCharged += additionalCharge;
          }

          bucketRows += rows.length;
          offset     += BATCH_SIZE;
          this.logger.debug(
            `Batch — tenant=${tenantId ?? 'legacy'} offset=${offset} rows=${rows.length}`,
          );
        } // end while

        grandTotalRows    += bucketRows;
        grandTotalCharged += bucketCharged;
        this.logger.log(
          `Tenant ${tenantId ?? 'legacy'} complete — ` +
          `rows=${bucketRows} UGX=${bucketCharged.toLocaleString()} rate=${dailyRate}/day`,
        );
      } // end for bucket

      this.logger.log(
        `Penalty job complete — ` +
        `total rows=${grandTotalRows} total UGX=${grandTotalCharged.toLocaleString()}`,
      );
    } catch (err) {
      this.logger.error(
        'Penalty calculation job failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}

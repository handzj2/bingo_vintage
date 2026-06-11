/**
 * ArrearsCalculationJob  —  Loan Arrears Aggregation Engine
 *
 * Runs every day at 02:00 AM (after penalty job at 01:00 AM) and
 * pre-computes arrears totals onto each Loan row so dashboards never
 * need to scan loan_schedules at query time.
 *
 * ── What it writes to loans ───────────────────────────────────────────────
 *   total_arrears   = SUM(amount_due - amount_paid + penalty_amount)
 *                     across all OVERDUE and PARTIAL schedules for this loan
 *   days_in_arrears = MAX(overdue_days) across those same schedules
 *
 * ── Batching ─────────────────────────────────────────────────────────────────
 *   Iterates ACTIVE + DELINQUENT loans in batches of 100.
 *   One SQL GROUP BY per batch — no N+1.
 *   Loans with no overdue/partial rows are reset to 0 (stale figures cleared).
 *
 * ── Module registration ───────────────────────────────────────────────────────
 *   Add to LoansModule providers array:
 *     providers: [LoansService, ArrearsCalculationJob]
 *
 *   LoansModule already imports TypeOrmModule.forFeature([Loan, ...]) — no
 *   additional imports needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';

const BATCH_SIZE = 100;

@Injectable()
export class ArrearsCalculationJob {
  private readonly logger = new Logger(ArrearsCalculationJob.name);

  constructor(
    @InjectRepository(Loan)
    private readonly loanRepo: Repository<Loan>,
  ) {}

  /**
   * aggregateArrears()
   *
   * Scheduled: 02:00 AM daily — AFTER penalty job (01:00 AM) so all
   * penalty_amount values are already current when we aggregate.
   */
  @Cron('0 2 * * *')
  async aggregateArrears(): Promise<void> {
    this.logger.log('Arrears aggregation job started');

    try {
      let offset  = 0;
      let updated = 0;
      let cleared = 0;

      while (true) {
        // ── Step 1: Fetch next batch of active/delinquent loans ────────
        const loans: Array<{ id: number }> = await this.loanRepo.manager.query(
          `SELECT id
             FROM loans
            WHERE status IN ('ACTIVE', 'DELINQUENT')
            ORDER BY id ASC
            LIMIT $1 OFFSET $2`,
          [BATCH_SIZE, offset],
        );

        if (loans.length === 0) break;

        const loanIds = loans.map((l) => l.id);

        // ── Step 2: Aggregate in ONE query for the entire batch ────────
        const aggregates: Array<{
          loan_id:         number;
          total_arrears:   string;
          days_in_arrears: string;
        }> = await this.loanRepo.manager.query(
          `SELECT
              loan_id,
              COALESCE(
                SUM(
                  GREATEST(0,
                    CAST(amount_due      AS NUMERIC)
                    - CAST(amount_paid   AS NUMERIC)
                    + CAST(penalty_amount AS NUMERIC)
                  )
                ), 0
              )::NUMERIC(12,2)               AS total_arrears,
              COALESCE(MAX(overdue_days), 0)  AS days_in_arrears
             FROM loan_schedules
            WHERE loan_id = ANY($1)
              AND status IN ('OVERDUE', 'PARTIAL')
            GROUP BY loan_id`,
          [loanIds],
        );

        // Build O(1) lookup map
        const aggMap = new Map<number, { totalArrears: number; daysInArrears: number }>();
        for (const row of aggregates) {
          aggMap.set(Number(row.loan_id), {
            totalArrears:  parseFloat(row.total_arrears),
            daysInArrears: parseInt(row.days_in_arrears, 10),
          });
        }

        // ── Step 3: Write each loan (raw SQL per row) ──────────────────
        for (const loan of loans) {
          const agg           = aggMap.get(loan.id);
          const totalArrears  = agg?.totalArrears  ?? 0;
          const daysInArrears = agg?.daysInArrears ?? 0;

          await this.loanRepo.manager.query(
            `UPDATE loans
                SET total_arrears   = $1,
                    days_in_arrears = $2,
                    updated_at      = NOW()
              WHERE id = $3`,
            [totalArrears, daysInArrears, loan.id],
          );

          totalArrears > 0 ? updated++ : cleared++;
        }

        offset += BATCH_SIZE;
        this.logger.debug(
          `Arrears batch done — offset=${offset} loans=${loans.length}`,
        );
      }

      this.logger.log(
        `Arrears aggregation complete — updated=${updated} | cleared=${cleared}`,
      );
    } catch (err) {
      this.logger.error(
        'Arrears aggregation job failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}

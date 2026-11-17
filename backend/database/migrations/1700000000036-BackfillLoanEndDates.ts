import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill loans.end_date.
 *
 * loans.end_date is nullable and two creation paths never filled it (bike-loan creation and the
 * historical import), so those loans show no end date. New code now always sets it
 * (loans/loan-dates.util.ts); this migration repairs the rows that already exist.
 *
 * Definition used everywhere: the due date of the loan's FINAL instalment.
 *   1. If the loan has a live schedule, take the latest due date on its active schedule rows
 *      (this is exactly what the loan page's schedule shows).
 *   2. Otherwise calculate it from start_date and the term:
 *        weekly loans  (term_weeks > 0)  → start_date + term_weeks weeks
 *        monthly loans (term_months > 0) → start_date + term_months months
 *      (PostgreSQL month arithmetic clamps to month-end the same way date-fns addMonths does.)
 *
 * Only rows whose end_date is NULL are touched. Nothing else on the loan changes.
 */
export class BackfillLoanEndDates1700000000036 implements MigrationInterface {
  name = 'BackfillLoanEndDates1700000000036';

  public async up(q: QueryRunner): Promise<void> {
    // 1. From the live schedule.
    await q.query(`
      UPDATE loans l
         SET end_date   = s.last_due,
             updated_at = NOW()
        FROM (
          SELECT loan_id, MAX(due_date)::date AS last_due
            FROM loan_schedules
           WHERE COALESCE(is_active, true) = true
           GROUP BY loan_id
        ) s
       WHERE s.loan_id = l.id
         AND l.end_date IS NULL
    `);

    // 2. From start date + term, for loans that have no schedule rows.
    await q.query(`
      UPDATE loans
         SET end_date = CASE
               WHEN COALESCE(term_weeks, 0)  > 0 THEN (start_date + (term_weeks * 7) * INTERVAL '1 day')::date
               WHEN COALESCE(term_months, 0) > 0 THEN (start_date + term_months * INTERVAL '1 month')::date
             END,
             updated_at = NOW()
       WHERE end_date IS NULL
         AND start_date IS NOT NULL
         AND (COALESCE(term_weeks, 0) > 0 OR COALESCE(term_months, 0) > 0)
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty: the rows that were NULL before cannot be told apart from rows that
    // already had a correct end date, and a recalculated end date is never wrong to keep.
  }
}

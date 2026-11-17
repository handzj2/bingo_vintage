import { addMonths, addWeeks } from 'date-fns';

/**
 * One definition of "when does this loan end", shared by every code path that creates or changes a loan.
 *
 * The end date is the due date of the FINAL instalment, using exactly the same date arithmetic the
 * schedule calculators use (weekly-flat: addWeeks(start, N); monthly-flat: addMonths(start, N)),
 * so the loan header and the schedule can never disagree.
 *
 * Before this existed each path did its own thing: bike-loan creation and the historical import
 * stored no end date at all; reschedule always counted months (wrong for weekly bike loans);
 * a terms correction only refreshed the end date when the start date was also changed.
 */

export type LoanKind = 'bike' | 'cash';

/** 'bike' / 'BIKE' / 'Bike' → 'bike'; anything else → 'cash'. */
export function normalizeLoanType(value?: string | null): LoanKind {
  return String(value ?? '').trim().toLowerCase() === 'bike' ? 'bike' : 'cash';
}

export interface LoanTermInput {
  startDate?: Date | string | null;
  termWeeks?: number | string | null;
  termMonths?: number | string | null;
}

/** Final instalment date, or null when the start date or the term is missing/invalid. */
export function calculateLoanEndDate(loan: LoanTermInput): Date | null {
  if (!loan.startDate) return null;
  const start = new Date(loan.startDate);
  if (isNaN(start.getTime())) return null;

  const weeks = Number(loan.termWeeks) || 0;
  if (weeks > 0) return addWeeks(start, weeks);

  const months = Number(loan.termMonths) || 0;
  if (months > 0) return addMonths(start, months);

  return null;
}

/**
 * The term a loan of this type must carry. Returns an error message, or null when consistent.
 * Bike loans are weekly (term in weeks); cash loans are monthly (term in months).
 */
export function termProblem(
  loanType: string | null | undefined,
  termWeeks: number | string | null | undefined,
  termMonths: number | string | null | undefined,
): string | null {
  const kind = normalizeLoanType(loanType);
  if (kind === 'bike' && !(Number(termWeeks) > 0)) return 'A bike loan needs a term in weeks.';
  if (kind === 'cash' && !(Number(termMonths) > 0)) return 'A cash loan needs a term in months.';
  return null;
}

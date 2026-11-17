/**
 * One place that turns the loan returned by GET /loans/:id into the typed shape the loan page uses.
 *
 * The backend sends the TypeORM entity as camelCase JSON (loanType, loanNumber, principalAmount,
 * startDate …). The loan page used to read snake_case names (loan.loan_type, loan.loan_number …) that
 * never exist on that object, so every loan showed as "Cash", with a blank loan number, principal 0,
 * blank dates, no client and no bike details — although loan_number, client_id, principal_amount and
 * start_date are NOT NULL in the database. Normalising once, here, means the page cannot drift again.
 */

export type LoanKind = 'bike' | 'cash';

export interface LoanClient {
  id: number | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
}

export interface LoanBike {
  id: number | null;
  model: string | null;
  registrationNumber: string | null;
  frameNumber: string | null;
  engineNumber: string | null;
  salePrice: number | null;
}

export interface LoanDetail {
  id: number;
  loanNumber: string;
  loanType: LoanKind;
  status: string;
  principalAmount: number;
  totalAmount: number;
  balance: number;
  deposit: number;
  processingFee: number;
  /** Stored as a decimal fraction (0.15 = 15%). */
  interestRate: number;
  termWeeks: number | null;
  termMonths: number | null;
  weeklyAmount: number | null;
  startDate: string | null;
  /** Stored end date, or — when none is stored — the date calculated from start date and term. */
  endDate: string | null;
  endDateIsCalculated: boolean;
  approvedBy: number | null;
  approvedAt: string | null;
  notes: string | null;
  client: LoanClient | null;
  bike: LoanBike | null;
}

const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o?.[k] !== undefined && o[k] !== null) return o[k];
  return null;
};
const num = (v: any): number => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);
const numOrNull = (v: any): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
};

export function normalizeLoanKind(v: any): LoanKind {
  return String(v ?? '').trim().toLowerCase() === 'bike' ? 'bike' : 'cash';
}

/** Calendar-month addition that clamps to month end (31 Jan + 1 month = 28/29 Feb), like date-fns addMonths. UTC throughout so the result does not depend on the viewer's time zone. */
function addMonthsClamped(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/**
 * Due date of the final instalment: start + N weeks for weekly loans, start + N months otherwise.
 * Same rule the backend uses (loans/loan-dates.util.ts) so the two never disagree.
 */
export function calculateEndDate(start: any, termWeeks: any, termMonths: any): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (isNaN(s.getTime())) return null;
  const weeks = Number(termWeeks) || 0;
  const months = Number(termMonths) || 0;
  let end: Date | null = null;
  if (weeks > 0) { end = new Date(s.getTime()); end.setUTCDate(end.getUTCDate() + weeks * 7); }
  else if (months > 0) end = addMonthsClamped(s, months);
  return end ? end.toISOString().slice(0, 10) : null;
}

export function normalizeLoan(raw: any): LoanDetail {
  const c = raw?.client;
  const fullName = c
    ? (`${pick(c, 'firstName', 'first_name') ?? ''} ${pick(c, 'lastName', 'last_name') ?? ''}`.trim() || pick(c, 'fullName', 'full_name'))
    : null;

  const b = raw?.bike;
  const termWeeks = numOrNull(pick(raw, 'termWeeks', 'term_weeks'));
  const termMonths = numOrNull(pick(raw, 'termMonths', 'term_months'));
  const startDate = pick(raw, 'startDate', 'start_date');
  const storedEnd = pick(raw, 'endDate', 'end_date');
  const calculatedEnd = storedEnd ? null : calculateEndDate(startDate, termWeeks, termMonths);

  return {
    id: Number(raw?.id),
    loanNumber: pick(raw, 'loanNumber', 'loan_number') ?? `Loan #${raw?.id}`,
    loanType: normalizeLoanKind(pick(raw, 'loanType', 'loan_type')),
    status: String(raw?.status ?? '').toUpperCase(),
    principalAmount: num(pick(raw, 'principalAmount', 'principal_amount')),
    totalAmount: num(pick(raw, 'totalAmount', 'total_amount')),
    balance: num(raw?.balance),
    deposit: num(raw?.deposit),
    processingFee: num(pick(raw, 'processingFee', 'processing_fee')),
    interestRate: num(pick(raw, 'interestRate', 'interest_rate')),
    termWeeks,
    termMonths,
    weeklyAmount: numOrNull(pick(raw, 'weeklyAmount', 'weekly_amount')),
    startDate,
    endDate: storedEnd ?? calculatedEnd,
    endDateIsCalculated: !storedEnd && !!calculatedEnd,
    approvedBy: numOrNull(pick(raw, 'approvedBy', 'approved_by')),
    approvedAt: pick(raw, 'approvedAt', 'approved_at'),
    notes: raw?.notes ?? null,
    client: c
      ? { id: numOrNull(c.id), fullName, phone: pick(c, 'phone') , email: pick(c, 'email') }
      : null,
    bike: b
      ? {
          id: numOrNull(b.id),
          model: pick(b, 'model'),
          registrationNumber: pick(b, 'registration_number', 'registrationNumber'),
          frameNumber: pick(b, 'frame_number', 'frameNumber'),
          engineNumber: pick(b, 'engine_number', 'engineNumber'),
          salePrice: numOrNull(pick(b, 'sale_price', 'salePrice')),
        }
      : null,
  };
}

/**
 * Things about a loan that look wrong or incomplete, in plain words, so the page can say so instead
 * of silently showing a dash. Nothing here blocks anything; it points the user at the correction.
 */
export function loanDataProblems(loan: LoanDetail): string[] {
  const out: string[] = [];
  const weeks = loan.termWeeks ?? 0;
  const months = loan.termMonths ?? 0;

  if (!(loan.principalAmount > 0)) out.push('Principal amount is zero.');
  if (!loan.client?.fullName) out.push('No client is linked to this loan.');
  if (!loan.startDate) out.push('No start date is recorded.');

  if (loan.loanType === 'cash' && weeks > 0)
    out.push(`Recorded as a CASH loan but it has a weekly term (${weeks} weeks) — it looks like a bike loan.`);
  if (loan.loanType === 'cash' && loan.bike?.id)
    out.push('Recorded as a CASH loan but a bike is linked to it — it looks like a bike loan.');
  if (loan.loanType === 'bike' && !(weeks > 0)) out.push('Bike loan with no term in weeks.');
  if (loan.loanType === 'cash' && weeks === 0 && !(months > 0)) out.push('Cash loan with no term in months.');
  if (!loan.endDate) out.push('No end date, and one cannot be calculated because the term is missing.');

  return out;
}

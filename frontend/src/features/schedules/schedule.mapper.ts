/**
 * Normalises the response of GET /schedules/loan/:id into the stable shape used by
 * the loan detail page and the full schedule page.
 *
 * Backend getLoanSchedule returns:
 *   - schedules: raw SQL rows (snake_case: installment_number, due_date, amount_due, …)
 *   - summary: { totalInstallments, paidCount, overdueCount, totalPaid, totalDue, progressPct, … }
 *
 * The loan detail page historically expected:
 *   - schedules with camelCase (installmentNumber, dueDate, amountDue, amountPaid)
 *   - summary with { paid, total, overdue, totalOverdue, totalPaid, totalDue, progressPct }
 *
 * This mapper is the single place that bridges the two. Schedule calculation and
 * filtering (is_active, versioning) remain exclusively in SchedulesService.
 */

export interface ScheduleRow {
  id: number;
  installmentNumber: number;
  dueDate: string | null;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  status: string;
  isToday?: boolean;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  paidDate?: string | null;
  [key: string]: any;
}

export interface ScheduleSummary {
  paid: number;
  total: number;
  partial: number;
  overdue: number;
  upcoming: number;
  totalPaid: number;
  totalDue: number;
  totalOverdue: number;
  outstanding: number;
  progressPct: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  paidCount: number;
  totalInstallments: number;
  overdueCount: number;
  partialCount: number;
  upcomingCount: number;
}

export interface LoanScheduleView {
  loan: any;
  schedules: ScheduleRow[];
  summary: ScheduleSummary;
}

const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) {
    if (o?.[k] !== undefined && o[k] !== null) return o[k];
  }
  return null;
};

const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeRow(raw: any): ScheduleRow {
  const amountDue = num(pick(raw, 'amountDue', 'amount_due'));
  const amountPaid = num(pick(raw, 'amountPaid', 'amount_paid'));
  const remaining =
    num(pick(raw, 'remainingAmount', 'remaining_amount')) ||
    Math.max(0, amountDue - amountPaid);

  return {
    ...raw,
    id: Number(raw?.id ?? 0),
    installmentNumber: num(pick(raw, 'installmentNumber', 'installment_number')),
    dueDate: pick(raw, 'dueDate', 'due_date'),
    amountDue,
    amountPaid,
    remainingAmount: remaining,
    status: String(raw?.status ?? 'PENDING').toUpperCase(),
    isToday: Boolean(raw?.is_today ?? raw?.isToday),
    receiptNumber: pick(raw, 'receiptNumber', 'receipt_number'),
    paymentMethod: pick(raw, 'paymentMethod', 'payment_method'),
    paidDate: pick(raw, 'paidDate', 'paid_date'),
  };
}

/**
 * Accepts the raw JSON body of GET /schedules/loan/:id (or a pre-parsed object)
 * and returns a stable LoanScheduleView. Safe with empty, null, snake_case or
 * already-camelCase input.
 */
export function normalizeLoanSchedule(raw: any): LoanScheduleView {
  if (!raw || typeof raw !== 'object') {
    return {
      loan: null,
      schedules: [],
      summary: emptySummary(),
    };
  }

  const body = raw.data && typeof raw.data === 'object' ? raw.data : raw;

  const rowsIn = Array.isArray(body.schedules)
    ? body.schedules
    : Array.isArray(body)
      ? body
      : [];

  const schedules = rowsIn.map(normalizeRow);

  const s = body.summary && typeof body.summary === 'object' ? body.summary : {};

  const paidCount = num(pick(s, 'paidCount', 'paid'));
  const totalInstallments = num(pick(s, 'totalInstallments', 'total')) || schedules.length;
  const overdueCount = num(pick(s, 'overdueCount', 'overdue'));
  const partialCount = num(pick(s, 'partialCount', 'partial'));
  const upcomingCount = num(pick(s, 'upcomingCount', 'upcoming'));
  const totalPaid = num(pick(s, 'totalPaid'));
  const totalDue = num(pick(s, 'totalDue')) || schedules.reduce((n, r) => n + r.amountDue, 0);
  const outstanding = num(pick(s, 'outstanding'));
  const progressPct = num(pick(s, 'progressPct'));
  const nextDueDate = pick(s, 'nextDueDate', 'next_due_date');
  const nextDueAmount = num(pick(s, 'nextDueAmount', 'next_due_amount'));

  const totalOverdue =
    num(pick(s, 'totalOverdue', 'total_overdue')) ||
    schedules
      .filter((r) => r.status === 'OVERDUE')
      .reduce((n, r) => n + r.remainingAmount, 0);

  const summary: ScheduleSummary = {
    paid: paidCount,
    total: totalInstallments,
    partial: partialCount,
    overdue: overdueCount,
    upcoming: upcomingCount,
    totalPaid,
    totalDue,
    totalOverdue,
    outstanding,
    progressPct,
    nextDueDate,
    nextDueAmount,
    paidCount,
    totalInstallments,
    overdueCount,
    partialCount,
    upcomingCount,
  };

  return {
    loan: body.loan ?? null,
    schedules,
    summary,
  };
}

function emptySummary(): ScheduleSummary {
  return {
    paid: 0,
    total: 0,
    partial: 0,
    overdue: 0,
    upcoming: 0,
    totalPaid: 0,
    totalDue: 0,
    totalOverdue: 0,
    outstanding: 0,
    progressPct: 0,
    nextDueDate: null,
    nextDueAmount: 0,
    paidCount: 0,
    totalInstallments: 0,
    overdueCount: 0,
    partialCount: 0,
    upcomingCount: 0,
  };
}

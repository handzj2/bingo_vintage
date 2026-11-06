/**
 * Pure NPL / aging classification helpers.
 * Mirrors business rules used in ReportsService.getNplReport and bucketForDays.
 * Safe to unit-test without DB.
 */

export type LoanBookStatus = 'ACTIVE' | 'DELINQUENT' | 'DEFAULTED' | 'COMPLETED' | 'CANCELLED' | 'PENDING_APPROVAL' | string;

export function isNplLoan(
  status: LoanBookStatus,
  daysInArrears: number,
  thresholdDays = 90,
): boolean {
  const days = Number(daysInArrears) || 0;
  const threshold = Math.max(1, Math.min(3650, Number(thresholdDays) || 90));
  if (status === 'DEFAULTED') return true;
  if ((status === 'ACTIVE' || status === 'DELINQUENT') && days >= threshold) return true;
  return false;
}

export function nplRatioPercent(nplOutstanding: number, bookOutstanding: number): number {
  const den = Number(bookOutstanding) || 0;
  const num = Number(nplOutstanding) || 0;
  if (den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}

/** Same buckets as ReportsService.bucketForDays */
export function agingBucket(daysInArrears: number): string {
  const days = Number(daysInArrears) || 0;
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  if (days <= 180) return '91-180 days';
  return '180+ days';
}

/**
 * Boundary matrix for threshold 90:
 * 89 days ACTIVE → performing; 90 ACTIVE → NPL; 91 ACTIVE → NPL; DEFAULTED always NPL
 */
export function classifyLoanForNplReport(
  status: LoanBookStatus,
  daysInArrears: number,
  balance: number,
  thresholdDays = 90,
): { isNpl: boolean; agingBucket: string; includeInBookDenominator: boolean } {
  const includeInBookDenominator = ['ACTIVE', 'DELINQUENT', 'DEFAULTED'].includes(status);
  return {
    isNpl: isNplLoan(status, daysInArrears, thresholdDays),
    agingBucket: agingBucket(daysInArrears),
    includeInBookDenominator,
  };
}

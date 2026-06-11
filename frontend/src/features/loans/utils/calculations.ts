/**
 * SOURCE OF TRUTH: LOAN ENGINE
 * Cash loans  → Flat interest (matches backend calculateFlatInterest)
 * Bike loans  → Simple division, NO interest (price - deposit spread over weeks)
 *
 * RULE: installment shown here MUST match what backend saves to loan_schedules.amount_due
 */

// ── CASH LOAN: Flat interest ────────────────────────────────────────────────
// Formula: totalInterest = principal * (rate/100) * months  (annual rate applied per month)
// Backend matches: calculateFlatInterest(principal, months, annualRate)
export const calculateCashLoan = (principal: number, annualRate: number, months: number) => {
  if (months <= 0) return { totalInterest: 0, totalPayable: principal, installment: 0 };

  const rate = annualRate / 100; // convert percent to decimal
  const totalInterest = principal * rate * months;
  const totalPayable  = principal + totalInterest;
  const installment   = Math.round(totalPayable / months);

  return {
    principal,
    totalInterest: Math.round(totalInterest),
    totalPayable:  Math.round(totalPayable),
    installment,
  };
};

// ── BIKE LOAN: No interest — simple principal division over weeks ──────────
// Formula: installment = ceil((salePrice - deposit) / weeks)
// Backend matches: Math.ceil(principalAmount / term_weeks)
export const calculateBikeLoan = (salePrice: number, deposit: number, _annualRate: number, weeks: number) => {
  const principal   = salePrice - deposit;
  if (weeks <= 0 || principal <= 0) {
    return { financed: principal, totalInterest: 0, totalPayable: principal, installment: 0 };
  }

  const installment  = Math.ceil(principal / weeks);
  const totalPayable = installment * weeks; // last installment may be slightly less due to ceil
  const totalInterest = 0; // bike loans carry no interest — price already includes margin

  return {
    financed: Math.round(principal),
    totalInterest,
    totalPayable:  Math.round(totalPayable),
    installment,
  };
};
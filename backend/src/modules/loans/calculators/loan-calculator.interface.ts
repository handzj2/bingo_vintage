// One canonical owner for "given these loan terms, what is the repayment
// schedule." LoansService orchestrates (resolve product → validate →
// resolve calculator → build context → calculate → persist) but never
// branches on what kind of math a product uses, and never performs a
// repayment calculation itself. New products are added by writing a class
// implementing this interface and registering it in LoanCalculatorRegistry
// — never by editing LoansService.

export interface ScheduleInstallment {
  installmentNumber: number;
  dueDate:            Date;
  amountDue:          number;
  principalDue:       number;
  interestDue:        number;
}

export interface LoanCalculationResult {
  totalInterest: number;
  totalPayable:  number;
  installments:  ScheduleInstallment[];
}

/**
 * Everything a calculator may ever need to compute a schedule. Every
 * future calculator (reducing balance, salary deduction, seasonal
 * agriculture, balloon payment, etc.) receives the same shape — adding a
 * new calculator never requires changing this interface for an unrelated
 * one's sake; a calculator simply ignores fields it doesn't use.
 */
export interface LoanCalculationContext {
  tenantId?:           number;
  clientId?:           number;
  /** The tenant-owned LoanProduct this loan is being created from, if any (absent on the legacy path). */
  loanProduct?:        { id: number; code: string; name: string } | null;
  principal:           number;
  /** Number of repayment periods — months or weeks, per the calculator's own cadence. */
  termCount:           number;
  annualInterestRate:  number;
  processingFee:       number;
  startDate:           Date;
  /** A calculator-specific cadence hint (e.g. 'monthly', 'weekly') — informational, not authoritative; the calculator itself defines its own cadence via its math. */
  repaymentFrequency?: string;
  /** Free-form, calculator-specific extra data that doesn't fit the typed fields above. */
  metadata?:           Record<string, any>;
}

/**
 * Optional, calculator-specific adjustments to an otherwise computed
 * schedule. A calculator is free to ignore any override it doesn't
 * support — e.g. MonthlyFlatCalculator has no concept of a negotiated
 * per-installment amount and ignores installmentOverride entirely;
 * WeeklyFlatCalculator honors it, matching the real frontend's existing
 * manually-editable weekly_installment field.
 */
export interface LoanCalculationOverrides {
  /** A specific per-installment amount, overriding whatever the calculator would otherwise compute. Honored only by calculators that support negotiated repayment plans. */
  installmentOverride?: number;
  firstDueDateOverride?: Date;
  roundingStrategy?:     'round' | 'ceil' | 'floor';
  gracePeriodDays?:      number;
  customFees?:           { label: string; amount: number }[];
}

export interface LoanCalculator {
  /** Must match a real loan_products.calculation_method value exactly. */
  readonly calculationMethod: string;

  calculate(
    context: LoanCalculationContext,
    overrides?: LoanCalculationOverrides,
  ): LoanCalculationResult;
}

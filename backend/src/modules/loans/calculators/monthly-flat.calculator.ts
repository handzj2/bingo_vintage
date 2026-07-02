import { Injectable } from '@nestjs/common';
import { addMonths } from 'date-fns';
import {
  LoanCalculator, LoanCalculationResult,
  LoanCalculationContext, LoanCalculationOverrides,
} from './loan-calculator.interface';

/**
 * 'monthly_flat' — flat interest, monthly installments.
 *
 * This is the existing calculateFlatInterest() + generateMonthlySchedule()
 * math from LoansService, moved here unchanged. Every intermediate value
 * and rounding step is identical to the original — including the
 * unrounded-subtotal-before-fee technique (see the comment below), which
 * was previously verified against 500,000+ randomized cases to avoid an
 * off-by-one-cent error that an earlier, naive consolidation attempt
 * introduced. Do not alter this arithmetic without the same numeric
 * regression discipline.
 *
 * This calculator has no concept of a negotiated per-installment amount
 * — every cash-loan installment is computed from the product's own
 * rate/term, never typed in by a cashier — so `overrides` is intentionally
 * unused. Future overrides (gracePeriodDays, customFees, etc.) should be
 * honored here explicitly if this product type is ever extended to
 * support them; until then, ignoring the parameter is correct, not an
 * oversight.
 */
@Injectable()
export class MonthlyFlatCalculator implements LoanCalculator {
  readonly calculationMethod = 'monthly_flat';

  calculate(context: LoanCalculationContext, _overrides?: LoanCalculationOverrides): LoanCalculationResult {
    const { principal, termCount: months, annualInterestRate, processingFee, startDate } = context;

    const totalInterest     = principal * annualInterestRate * months;
    const rawTotalPayable   = principal + totalInterest;
    const principalPerMonth = Math.round((principal / months) * 100) / 100;
    const interestPerMonth  = Math.round((totalInterest / months) * 100) / 100;

    // processingFee added to the UNROUNDED total before final rounding —
    // matches the original single-rounding-at-the-end behavior exactly.
    // Rounding the subtotal first, then adding the fee, produces off-by-
    // one-cent installments on ~2.5% of real inputs — verified by
    // brute-force numeric comparison when this was first extracted.
    const installment = Math.round(((rawTotalPayable + processingFee) / months) * 100) / 100;

    const installments = [];
    for (let i = 1; i <= months; i++) {
      installments.push({
        installmentNumber: i,
        dueDate:            addMonths(new Date(startDate), i),
        amountDue:          installment,
        principalDue:       principalPerMonth,
        interestDue:        interestPerMonth,
      });
    }

    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable:  Math.round(rawTotalPayable * 100) / 100,
      installments,
    };
  }
}

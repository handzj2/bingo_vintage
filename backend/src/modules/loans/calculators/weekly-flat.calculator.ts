import { Injectable } from '@nestjs/common';
import { addWeeks } from 'date-fns';
import {
  LoanCalculator, LoanCalculationResult,
  LoanCalculationContext, LoanCalculationOverrides,
} from './loan-calculator.interface';

/**
 * 'weekly_flat' — zero interest, weekly installments.
 *
 * This is the existing generateWeeklySchedule() logic from LoansService.
 * Bike loans are genuinely zero-interest by design (confirmed:
 * principalDue = amountDue, interestDue = 0 on every installment) — the
 * client repays only the principal, matching create()'s own comment
 * ("zero interest — client repays principal only"). The final
 * installment absorbs whatever rounding remainder is left so the
 * schedule always sums exactly to the loan's principal.
 *
 * Honors overrides.installmentOverride: the real frontend form
 * (dashboard/loans/create/page.tsx) lets a cashier manually type a
 * weekly_installment value that is not always equal to
 * principal/totalWeeks — confirmed by direct inspection before this
 * calculator was first wired into a real call site. When no override is
 * supplied, behavior is byte-identical to the original derivation.
 *
 * annualInterestRate and processingFee remain intentionally unused —
 * matching the original method's signature, which never accepted them.
 */
@Injectable()
export class WeeklyFlatCalculator implements LoanCalculator {
  readonly calculationMethod = 'weekly_flat';

  calculate(context: LoanCalculationContext, overrides?: LoanCalculationOverrides): LoanCalculationResult {
    const { principal, termCount: totalWeeks, startDate } = context;

    const derivedInstallment = Math.round((principal / totalWeeks) * 100) / 100;
    const weeklyInstallment  = overrides?.installmentOverride ?? derivedInstallment;

    const installments = [];
    let remaining = principal;
    for (let w = 1; w <= totalWeeks; w++) {
      const isLast    = w === totalWeeks;
      const amountDue = isLast
        ? Math.round(Math.max(0, remaining) * 100) / 100
        : weeklyInstallment;

      installments.push({
        installmentNumber: w,
        dueDate:            addWeeks(new Date(startDate), w),
        amountDue,
        principalDue:       amountDue,
        interestDue:        0,
      });

      remaining = Math.max(0, remaining - weeklyInstallment);
    }

    return {
      totalInterest: 0,
      totalPayable:  principal,
      installments,
    };
  }
}

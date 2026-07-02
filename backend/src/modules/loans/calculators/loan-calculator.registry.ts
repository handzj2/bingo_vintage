import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { LoanCalculator } from './loan-calculator.interface';
import { MonthlyFlatCalculator } from './monthly-flat.calculator';
import { WeeklyFlatCalculator } from './weekly-flat.calculator';

export const LOAN_CALCULATORS = 'LOAN_CALCULATORS';

/**
 * Resolves a loan_products.calculation_method value to its calculator.
 *
 * Adding a new calculation method (e.g. 'reducing_balance',
 * 'salary_deduction', 'interest_free') means:
 *   1. Write a new class implementing LoanCalculator.
 *   2. Add it to the calculators array in LoansModule's provider below.
 *   3. Set that calculation_method on the relevant loan_products row(s).
 * Nothing in LoansService or this registry changes.
 */
@Injectable()
export class LoanCalculatorRegistry {
  private readonly byMethod = new Map<string, LoanCalculator>();

  constructor(@Inject(LOAN_CALCULATORS) calculators: LoanCalculator[]) {
    for (const calc of calculators) {
      this.byMethod.set(calc.calculationMethod, calc);
    }
  }

  resolve(calculationMethod: string): LoanCalculator {
    const calculator = this.byMethod.get(calculationMethod);
    if (!calculator) {
      throw new BadRequestException(
        `No calculator registered for calculation_method "${calculationMethod}". ` +
        `A loan_products row may declare a calculation_method with no corresponding ` +
        `engine implementation — that is a deployment/configuration error, not a ` +
        `tenant or business-rule error.`,
      );
    }
    return calculator;
  }
}

export const loanCalculatorProviders = [
  MonthlyFlatCalculator,
  WeeklyFlatCalculator,
  {
    provide: LOAN_CALCULATORS,
    useFactory: (monthly: MonthlyFlatCalculator, weekly: WeeklyFlatCalculator) => [monthly, weekly],
    inject: [MonthlyFlatCalculator, WeeklyFlatCalculator],
  },
];

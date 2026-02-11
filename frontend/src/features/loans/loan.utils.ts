/**
 * REBUILD [2026-01-10]: Core Loan Calculation Engine
 * Matches NestJS Service: principal * (1 + rate * term)
 */

export const calculateCashLoan = (principal: number, monthlyRate: number, months: number) => {
  const interest = principal * (monthlyRate / 100) * months;
  const totalPayable = principal + interest;
  return {
    principalAmount: principal,
    totalInterest: interest,
    totalPayable,
    installment: months > 0 ? totalPayable / months : 0
  };
};

export const calculateBikeLoan = (salePrice: number, deposit: number, weeklyRate: number, weeks: number) => {
  const principal = salePrice - deposit;
  const interest = principal * (weeklyRate / 100) * weeks;
  const totalPayable = principal + interest;
  return {
    principalAmount: principal,
    totalInterest: interest,
    totalPayable,
    installment: weeks > 0 ? totalPayable / weeks : 0
  };
};
/**
 * SOURCE OF TRUTH: LOAN ENGINE
 * Standardizing to Amortized (Reducing Balance) for Cash 
 * and Flat/Weekly for Bike Assets.
 */

export const calculateCashLoan = (principal: number, annualRate: number, months: number) => {
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return { 
      totalInterest: 0, 
      totalPayable: principal, 
      installment: months > 0 ? principal / months : 0 
    };
  }

  // EMI Formula: [P x r x (1+r)^n] / [(1+r)^n - 1]
  const installment = 
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayable = installment * months;

  return {
    principal,
    totalInterest: totalPayable - principal,
    totalPayable,
    installment: Math.round(installment)
  };
};

export const calculateBikeLoan = (bikeValue: number, deposit: number, annualRate: number, weeks: number) => {
  const principal = bikeValue - deposit;
  const weeklyRate = annualRate / 100 / 52;
  
  // Weekly EMI logic for Asset Finance
  const installment = (principal * weeklyRate * Math.pow(1 + weeklyRate, weeks)) / 
                      (Math.pow(1 + weeklyRate, weeks) - 1);

  const totalPayable = installment * weeks;

  return {
    financed: principal,
    totalInterest: totalPayable - principal,
    totalPayable,
    installment: Math.round(installment)
  };
};
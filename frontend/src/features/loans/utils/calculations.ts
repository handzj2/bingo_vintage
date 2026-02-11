export const calculateCashLoan = (
  principal: number,
  rate: number,
  periods: number
) => {
  const interest = principal * rate;
  const total = principal + interest;
  return {
    interest,
    total,
    installment: total / periods
  };
};

export const calculateBikeLoan = (
  bikeValue: number,
  deposit: number,
  rate: number,
  days: number
) => {
  const financed = bikeValue - deposit;
  const interest = financed * rate;
  const total = financed + interest;
  return {
    financed,
    interest,
    total,
    dailyInstallment: total / days
  };
};

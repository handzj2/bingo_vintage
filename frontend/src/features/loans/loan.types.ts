export type LoanType = "BIKE" | "CASH";

export interface BaseLoan {
  id?: string;
  client_id: string;
  loan_type: LoanType;
  principal_amount: number;
  interest_rate: number;
  interest_amount: number;
  total_payable: number;
  paid_amount: number;
  outstanding_balance: number;
  term_months: number;
  start_date: string;
  due_date: string;
  status: string;
}

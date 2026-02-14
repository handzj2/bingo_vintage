export type PaymentMethod = "cash" | "bank" | "MTNmomo";
export type LoanType = "CASH" | "BIKE"; // Added to distinguish products

export interface Payment {
  id: number;
  loan_id: number;
  loan_type: LoanType;   // 👈 New field: Identifies if it's for a Bike or Cash
  amount: number;
  payment_method: PaymentMethod;
  justification: string; 
  recorded_by: number;   
  created_at: string;
  is_reversed?: boolean; 
  reversed_at?: string;  
}
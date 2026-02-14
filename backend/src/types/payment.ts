// src/types/payment.ts
export interface RepaymentPayload {
  loan_id: string;
  amount: number;
  payment_method: 'cash' | 'momo' | 'bank';
  justification: string;  // REQUIRED per Governance Policy [2026-01-10]
  recorded_by: string;    // Staff ID
}
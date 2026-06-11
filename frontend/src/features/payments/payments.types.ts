// src/features/payments/payments.types.ts

// Matches backend PaymentMethod enum exactly
export type PaymentMethod = 'CASH' | 'Momo' | 'BANK_TRANSFER' | 'Airtelmoney';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REVERSED' | 'FAILED';

export interface Payment {
  id: number;
  loan_id: number;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_method: PaymentMethod;
  receipt_number: string;
  payment_date: string;
  status: PaymentStatus;
  transaction_id: string | null;
  notes: string | null;
  collected_by: string | null;
  schedule_id: number | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  reversed_by: string | null;
  created_at: string;
  updated_at: string;
}

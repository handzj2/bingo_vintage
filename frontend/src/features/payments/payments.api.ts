import { api } from "@/lib/api/client";
import type { Payment, PaymentMethod, CreatePaymentRequest, CreatePaymentResponse } from '@/shared/api-types';

export interface CreatePaymentPayload {
  loan_id: number;
  amount: number;
  payment_method: PaymentMethod;
  receipt_number?: string;   // auto-generated if not provided
  payment_date?: string;     // defaults to now if not provided
  notes?: string;
  collected_by?: string;
}

function generateReceipt(): string {
  return `RCT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

// FIX: was GET /repayments/ — correct endpoint is GET /payments
export const getPayments = async (): Promise<Payment[]> => {
  const result = await api.get<Payment[]>("/payments");
  if (result.success) return result.data ?? [];
  throw new Error(result.message || "Failed to fetch payments");
};

// FIX: was POST /repayments/ — correct endpoint is POST /payments
// FIX: removed loan_type, justification, recorded_by (not in backend DTO)
// FIX: added receipt_number and payment_date (required by backend)
export const createPayment = async (payload: CreatePaymentPayload) => {
  const body = {
    ...payload,
    receipt_number: payload.receipt_number || generateReceipt(),
    payment_date:   payload.payment_date   || new Date().toISOString(),
  };
  const result = await api.post("/payments", body);
  if (!result.success) throw new Error(result.message || "Failed to record payment");
  return result.data;
};

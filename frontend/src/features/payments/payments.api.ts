import { api } from "@/lib/api/client";
import { Payment, PaymentMethod } from "./payments.types";

export interface CreatePaymentPayload {
  loan_id: number;
  loan_type: "CASH" | "BIKE"; // 👈 Required to identify the asset type
  amount: number;
  payment_method: PaymentMethod;
  justification: string; // Policy [2026-01-10] requirement
  recorded_by: number;
}

/**
 * Fetches the immutable payment ledger.
 * Accesses .data because the ApiClient returns { success, data }
 */
export const getPayments = async (): Promise<Payment[]> => {
  const result = await api.get("/repayments/");

  if (result.success) {
    return result.data;
  }

  // If success is false, we throw so the UI can catch the error message
  throw new Error(result.message || "Failed to fetch ledger");
};

/**
 * Records a new payment.
 * Policy [2026-01-10]: Recorded data is immutable.
 */
export const createPayment = async (payload: CreatePaymentPayload) => {
  const result = await api.post("/repayments/", payload);

  if (!result.success) {
    throw new Error(result.message || "Failed to record payment");
  }

  return result.data;
};
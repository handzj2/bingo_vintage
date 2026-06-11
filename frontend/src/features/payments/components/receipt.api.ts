/**
 * receipt.api.ts
 *
 * This file was missing, causing the Next.js build to fail with:
 *   "Module not found: Can't resolve './receipt.api'"
 *
 * Provides two fetch functions:
 *   fetchReceiptByPaymentId  — primary, used immediately after recording a payment
 *   fetchReceiptByNumber     — fallback, used when reprinting from the payment list
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token')
    : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** Shape returned by GET /receipts/payment/:id */
export interface ReceiptData {
  payment_id:         number;
  receipt_no:         string;
  is_void:            boolean;
  void_reason?:       string;
  reprint:            boolean;

  payment_date:       string;
  payment_method:     string;
  amount:             number;
  principal_paid:     number;
  interest_paid:      number;
  notes:              string;
  collected_by:       string;
  transaction_id:     string;

  loan_number:        string;
  loan_type:          string;
  loan_principal:     number;
  loan_interest_rate: number;
  term_months:        number;
  balance_remaining:  number;

  client_name:        string;
  client_phone:       string;
  client_id_number:   string;

  bike_plate?:        string;
  bike_model?:        string;

  branch_name:        string;
  branch_location:    string;
  company_name:       string;
  company_phone:      string;
  printed_at:         string;
}

/** Fetch receipt by payment ID — use right after recording a payment */
export async function fetchReceiptByPaymentId(paymentId: number): Promise<ReceiptData> {
  const res = await fetch(`${API_URL}/receipts/payment/${paymentId}`, {
    headers: getHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to load receipt (${res.status})`);
  return json;
}

/** Fetch receipt by receipt number string — use from payment history list */
export async function fetchReceiptByNumber(receiptNumber: string): Promise<ReceiptData> {
  const res = await fetch(
    `${API_URL}/receipts/by-number/${encodeURIComponent(receiptNumber)}`,
    { headers: getHeaders() },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Failed to load receipt (${res.status})`);
  return json;
}

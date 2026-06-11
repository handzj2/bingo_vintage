// src/features/clients/client.types.ts

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  email: string;
  nin: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  occupation: string;
  monthly_income: number;
  employment_status: string;
  address: string;
  id_number?: string;
  tax_id?: string;
  status: string;
  verified: boolean;
  created_at: string;
  updated_at: string;

  // Additional fields from API
  credit_score?: number;
  loan_limit?: number;
  account_balance?: number;
  sync_status?: string;
  total_loans?: number;
  last_loan_date?: string;
  nationality?: string;
  alt_phone?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;

  // Employment details
  employer_name?: string;
  employer_phone?: string;
  employment_type?: string;
  years_employed?: number;

  // Business details
  business_name?: string;
  business_type?: string;
  business_address?: string;

  // Next of kin details
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
  next_of_kin_address?: string;

  // Bank details
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  bank_branch?: string;

  // References
  reference1_name?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_phone?: string;

  // Justification
  justification?: string;

  // Verification
  verification_method?: string;

  // Notes (used in detail page)
  notes?: string;
}
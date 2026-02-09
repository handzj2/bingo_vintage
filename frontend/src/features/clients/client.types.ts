export interface Client {
  id: string;

  first_name: string;
  last_name: string;
  full_name: string;

  email?: string;
  phone: string;
  alt_phone?: string;  // Added
  
  address?: string;
  city?: string;
  state?: string;  // Added
  country?: string;
  postal_code?: string;
  nationality?: string;

  id_number?: string;
  nin?: string;
  tax_id?: string;

  date_of_birth?: string;
  gender?: string;
  marital_status?: string;

  occupation?: string;
  employment_status?: string;
  monthly_income?: number;

  business_name?: string;
  business_type?: string;
  business_address?: string;

  bank_name?: string;
  account_number?: string;
  bank_branch?: string;

  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;

  // References - Added
  reference1_name?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_phone?: string;
  justification?: string;

  credit_score?: number;
  loan_limit?: number;
  account_balance?: number;

  status: string;
  verified: boolean;
  verification_method?: string;
  sync_status?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
}
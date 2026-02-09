export interface Client {
  // Core (11 fields)
  id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
  phone: string
  nin: string
  id_number?: string
  date_of_birth: string
  gender: string
  marital_status?: string
  
  // Address (6 fields)
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  nationality?: string
  
  // Employment (4 fields)
  occupation?: string
  employment_status?: string
  monthly_income?: number
  tax_id?: string
  
  // Banking (4 fields)
  bank_name?: string
  account_number?: string
  bank_branch?: string
  account_balance?: number
  
  // Next of Kin (3 fields)
  next_of_kin_name: string
  next_of_kin_phone: string
  next_of_kin_relationship?: string
  
  // Business (3 fields)
  business_name?: string
  business_type?: string
  business_address?: string
  
  // System (8 fields)
  status: string
  verified?: boolean
  verification_method?: string
  sync_status?: string
  credit_score?: number
  loan_limit?: number
  notes?: string
  
  // References (5 fields)
  justification?: string
  alt_phone?: string
  reference1_name?: string
  reference1_phone?: string
  reference2_name?: string
  reference2_phone?: string
  
  // Metadata (2 fields)
  created_at: string
  updated_at: string
}

export type ClientFormData = Partial<Client>

export interface ClientFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<Client>
  onSubmit: (data: Partial<Client>) => Promise<void>
  isLoading?: boolean
}
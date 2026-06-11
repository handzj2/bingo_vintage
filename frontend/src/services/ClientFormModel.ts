// Define the ClientFormModel type
export interface ClientFormModel {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  nin: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  occupation: string;
  employment_status: string;
  monthly_income: string | number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  business_name: string;
  business_type: string;
  business_address: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_branch: string;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
  next_of_kin_address: string;
  reference1_name: string;
  reference1_phone: string;
  reference2_name: string;
  reference2_phone: string;
  justification: string;
  alt_phone: string;
  status: string;
  verified: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  client_number?: string;
  id_number?: string;
  credit_score?: number;
  loan_limit?: number;
  sync_status?: string;
  verification_method?: string;
  risk_category?: string;
  loans_count?: number;
  active_loans?: number;
}

// Empty form for initial state
export const EMPTY_CLIENT_FORM: ClientFormModel = {
  id: '',
  full_name: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  nin: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  nationality: '',
  occupation: '',
  employment_status: '',
  monthly_income: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  business_name: '',
  business_type: '',
  business_address: '',
  bank_name: '',
  account_number: '',
  account_name: '',
  bank_branch: '',
  next_of_kin_name: '',
  next_of_kin_phone: '',
  next_of_kin_relationship: '',
  next_of_kin_address: '',
  reference1_name: '',
  reference1_phone: '',
  reference2_name: '',
  reference2_phone: '',
  justification: '',
  alt_phone: '',
  status: 'ACTIVE',
  verified: false,
  notes: '',
};

// ✅ UPDATED: Helper now correctly maps both flat and nested backend data to the Model
export function toClientFormModel(client: any): ClientFormModel {
  return {
    ...EMPTY_CLIENT_FORM,
    id: client.id || '',
    full_name: client.full_name || client.fullName || '',
    first_name: client.first_name || client.firstName || '',
    last_name: client.last_name || client.lastName || '',
    phone: client.phone || '',
    email: client.email || '',
    nin: client.nin || client.id_number || '',
    date_of_birth: client.date_of_birth || client.dateOfBirth || '',
    gender: client.gender || '',
    marital_status: client.marital_status || client.maritalStatus || '',
    nationality: client.nationality || '',
    occupation: client.occupation || '',
    employment_status: client.employment_status || client.employmentStatus || '',
    monthly_income: client.monthly_income || client.monthlyIncome || '',
    
    // Support for nested address from backend
    address: client.address?.street || client.address || '',
    city: client.address?.city || client.city || '',
    state: client.address?.state || client.state || '',
    country: client.address?.country || client.country || 'Uganda',
    postal_code: client.address?.postal_code || client.postal_code || '',
    
    // Support for nested business
    business_name: client.business?.name || client.business_name || '',
    business_type: client.business?.type || client.business_type || '',
    business_address: client.business?.address || client.business_address || '',
    
    // Support for nested bank details
    bank_name: client.bank_details?.bank_name || client.bank_name || '',
    account_number: client.bank_details?.account_number || client.account_number || '',
    account_name: client.bank_details?.account_name || client.account_name || '',
    bank_branch: client.bank_details?.branch || client.bank_branch || '',
    
    // Support for nested kin
    next_of_kin_name: client.kin?.name || client.next_of_kin_name || '',
    next_of_kin_phone: client.kin?.phone || client.next_of_kin_phone || '',
    next_of_kin_relationship: client.kin?.relationship || client.next_of_kin_relationship || '',
    next_of_kin_address: client.kin?.address || client.next_of_kin_address || '',
    
    reference1_name: client.reference1_name || '',
    reference1_phone: client.reference1_phone || '',
    reference2_name: client.reference2_name || '',
    reference2_phone: client.reference2_phone || '',
    justification: client.justification || '',
    alt_phone: client.alt_phone || '',
    status: client.status || 'ACTIVE',
    verified: client.verified || false,
    notes: client.notes || '',
    created_at: client.created_at || '',
    updated_at: client.updated_at || '',
    client_number: client.client_number || '',
    id_number: client.id_number || '',
  };
}

// ✅ UPDATED: Consistent with snake_case form keys
export function toClientFormData(formData: ClientFormModel): any {
  return {
    ...formData,
    monthly_income: formData.monthly_income?.toString() || '',
  };
}
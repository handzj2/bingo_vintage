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
  status: 'active',
  verified: false,
  notes: '',
};

// Helper function to convert FrontendClient to ClientFormModel
export function toClientFormModel(client: any): ClientFormModel {
  return {
    id: client.id || '',
    full_name: client.fullName || client.full_name || '',
    first_name: client.firstName || client.first_name || '',
    last_name: client.lastName || client.last_name || '',
    phone: client.phone || '',
    email: client.email || '',
    nin: client.nin || client.idNumber || '',
    date_of_birth: client.dateOfBirth || client.date_of_birth || '',
    gender: client.gender || '',
    marital_status: client.maritalStatus || client.marital_status || '',
    nationality: client.nationality || '',
    occupation: client.occupation || '',
    employment_status: client.employmentStatus || client.employment_status || '',
    monthly_income: client.monthlyIncome || client.monthly_income || '',
    address: client.address || client.street || '',
    city: client.city || '',
    state: client.state || '',
    country: client.country || '',
    postal_code: client.postalCode || client.postal_code || '',
    business_name: client.businessName || client.business?.name || '',
    business_type: client.businessType || client.business?.type || '',
    business_address: client.businessAddress || client.business?.address || '',
    bank_name: client.bankName || client.bank_details?.bank_name || '',
    account_number: client.accountNumber || client.bank_details?.account_number || '',
    account_name: client.accountName || client.bank_details?.account_name || '',
    bank_branch: client.bankBranch || client.bank_details?.branch || '',
    next_of_kin_name: client.nextOfKinName || client.kin?.name || '',
    next_of_kin_phone: client.nextOfKinPhone || client.kin?.phone || '',
    next_of_kin_relationship: client.nextOfKinRelation || client.nextOfKinRelationship || client.kin?.relationship || '',
    next_of_kin_address: client.nextOfKinAddress || client.kin?.address || '',
    reference1_name: client.reference1Name || client.reference1_name || '',
    reference1_phone: client.reference1Phone || client.reference1_phone || '',
    reference2_name: client.reference2Name || client.reference2_name || '',
    reference2_phone: client.reference2Phone || client.reference2_phone || '',
    justification: client.justification || '',
    alt_phone: client.altPhone || client.alt_phone || '',
    status: client.clientStatus || client.status || 'active',
    verified: client.verified || false,
    notes: client.notes || '',
    created_at: client.createdAt || client.created_at || '',
    updated_at: client.updatedAt || client.updated_at || '',
    client_number: client.clientNumber || client.client_number || '',
    id_number: client.idNumber || client.id_number || '',
  };
}

// Helper function to convert ClientFormModel to ClientFormData (for API submission)
export function toClientFormData(formData: ClientFormModel): any {
  return {
    firstName: formData.first_name,
    lastName: formData.last_name,
    fullName: formData.full_name,
    phone: formData.phone,
    email: formData.email,
    nin: formData.nin,
    idNumber: formData.id_number,
    dateOfBirth: formData.date_of_birth,
    gender: formData.gender,
    maritalStatus: formData.marital_status,
    nationality: formData.nationality,
    occupation: formData.occupation,
    employmentStatus: formData.employment_status,
    monthlyIncome: formData.monthly_income?.toString() || '',
    address: formData.address,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    postalCode: formData.postal_code,
    businessName: formData.business_name,
    businessType: formData.business_type,
    businessAddress: formData.business_address,
    bankName: formData.bank_name,
    accountNumber: formData.account_number,
    accountName: formData.account_name,
    bankBranch: formData.bank_branch,
    nextOfKinName: formData.next_of_kin_name,
    nextOfKinPhone: formData.next_of_kin_phone,
    nextOfKinRelationship: formData.next_of_kin_relationship,
    nextOfKinAddress: formData.next_of_kin_address,
    reference1_name: formData.reference1_name,
    reference1_phone: formData.reference1_phone,
    reference2_name: formData.reference2_name,
    reference2_phone: formData.reference2_phone,
    justification: formData.justification,
    alt_phone: formData.alt_phone,
    status: formData.status,
    verified: formData.verified,
    notes: formData.notes,
  };
}
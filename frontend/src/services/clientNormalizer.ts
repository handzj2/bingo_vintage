import { Client } from '@/features/clients/client.types'

export function normalizeClient(backend: any): Client {
  const firstName = backend.firstName || backend.first_name || ''
  const lastName = backend.lastName || backend.last_name || ''
  const fullName = backend.fullName || backend.full_name || `${firstName} ${lastName}`.trim()

  return {
    // Core
    id: String(backend.id),
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    email: backend.email,
    phone: backend.phone || '',
    alt_phone: backend.altPhone || backend.alt_phone || '',
    nin: backend.nin || backend.ninNumber || backend.idNumber || '',
    id_number: backend.idNumber || backend.id_number || backend.nin || '',
    date_of_birth: backend.dateOfBirth || backend.date_of_birth || '',
    gender: backend.gender || 'OTHER',
    marital_status: backend.maritalStatus || backend.marital_status || 'SINGLE',
    
    // Address (flat)
    address: backend.address || backend.physical_address || '',
    city: backend.city || '',
    state: backend.state || '',
    country: backend.country || 'Uganda',
    postal_code: backend.postalCode || backend.postal_code || '',
    nationality: backend.nationality || 'Ugandan',
    
    // Employment
    occupation: backend.occupation || '',
    employment_status: backend.employmentStatus || backend.employment_status || '',
    monthly_income: backend.monthlyIncome || backend.monthly_income || 0,
    tax_id: backend.taxId || backend.tax_id,
    
    // Banking
    bank_name: backend.bankName || backend.bank_name || '',
    account_number: backend.accountNumber || backend.account_number || '',
    bank_branch: backend.bankBranch || backend.bank_branch || '',
    account_balance: backend.accountBalance || backend.account_balance || 0,
    
    // Next of Kin (flat)
    next_of_kin_name: backend.nextOfKinName || backend.next_of_kin_name || '',
    next_of_kin_phone: backend.nextOfKinPhone || backend.next_of_kin_phone || '',
    next_of_kin_relationship: backend.nextOfKinRelationship || backend.next_of_kin_relationship || '',
    
    // Business
    business_name: backend.businessName || backend.business_name || '',
    business_type: backend.businessType || backend.business_type || '',
    business_address: backend.businessAddress || backend.business_address || '',
    
    // System
    status: backend.status || 'INACTIVE',
    verified: Boolean(backend.verified),
    verification_method: backend.verificationMethod || backend.verification_method || '',
    sync_status: backend.syncStatus || backend.sync_status || 'pending',
    credit_score: backend.creditScore || backend.credit_score || 0,
    loan_limit: backend.loanLimit || backend.loan_limit || 0,
    notes: backend.notes,
    
    // References
    justification: backend.justification || '',
    reference1_name: backend.reference1_name || '',
    reference1_phone: backend.reference1_phone || '',
    reference2_name: backend.reference2_name || '',
    reference2_phone: backend.reference2_phone || '',
    
    // Metadata
    created_at: backend.createdAt || backend.created_at || new Date().toISOString(),
    updated_at: backend.updatedAt || backend.updated_at || new Date().toISOString()
  }
}
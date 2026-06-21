// src/features/clients/client.api.ts
import { api } from '@/lib/api/client';
import type { Client } from '@/shared/api-types';

// The backend entity serializes with camelCase property names
// (firstName, dateOfBirth, maritalStatus, etc.) regardless of the
// snake_case DB column names — TypeORM uses the JS property name for
// JSON output. The Client type (and every form/page that consumes it)
// is snake_case. Without this mapping, fields like first_name/last_name
// silently stay blank on the edit form and the profile page, because
// `{ ...EMPTY, ...rawResponse }` never overwrites keys that don't match.
function mapDbClientToClient(raw: any): Client {
  return {
    id:                       String(raw.id),
    first_name:               raw.firstName ?? raw.first_name ?? '',
    last_name:                raw.lastName ?? raw.last_name ?? '',
    full_name:                raw.fullName ?? raw.full_name ?? `${raw.firstName ?? ''} ${raw.lastName ?? ''}`.trim(),
    phone:                    raw.phone ?? '',
    email:                    raw.email ?? '',
    nin:                      raw.nin ?? '',
    date_of_birth:            raw.dateOfBirth ?? raw.date_of_birth ?? '',
    gender:                   raw.gender ?? '',
    marital_status:           raw.maritalStatus ?? raw.marital_status ?? '',
    occupation:               raw.occupation ?? '',
    monthly_income:           raw.monthlyIncome != null ? parseFloat(raw.monthlyIncome) : (raw.monthly_income ?? 0),
    employment_status:        raw.employmentStatus ?? raw.employment_status ?? '',
    address:                  raw.address ?? '',
    id_number:                raw.idNumber ?? raw.id_number,
    tax_id:                   raw.taxID ?? raw.tax_id,
    status:                   raw.status ?? 'active',
    verified:                 raw.verified ?? false,
    created_at:               raw.createdAt ?? raw.created_at ?? '',
    updated_at:               raw.updatedAt ?? raw.updated_at ?? '',
    credit_score:             raw.creditScore ?? raw.credit_score,
    loan_limit:               raw.loanLimit ?? raw.loan_limit,
    account_balance:          raw.accountBalance ?? raw.account_balance,
    sync_status:              raw.syncStatus ?? raw.sync_status,
    nationality:              raw.nationality,
    alt_phone:                raw.altPhone ?? raw.alt_phone,
    city:                     raw.city,
    state:                    raw.state,
    country:                  raw.country,
    postal_code:              raw.postalCode ?? raw.postal_code,
    business_name:            raw.businessName ?? raw.business_name,
    business_type:            raw.businessType ?? raw.business_type,
    business_address:         raw.businessAddress ?? raw.business_address,
    next_of_kin_name:         raw.nextOfKinName ?? raw.next_of_kin_name,
    next_of_kin_phone:        raw.nextOfKinPhone ?? raw.next_of_kin_phone,
    next_of_kin_relationship: raw.nextOfKinRelationship ?? raw.next_of_kin_relationship,
    bank_name:                raw.bankName ?? raw.bank_name,
    account_number:           raw.accountNumber ?? raw.account_number,
    bank_branch:              raw.bankBranch ?? raw.bank_branch,
    reference1_name:          raw.reference1Name ?? raw.reference1_name,
    reference1_phone:         raw.reference1Phone ?? raw.reference1_phone,
    reference2_name:          raw.reference2Name ?? raw.reference2_name,
    reference2_phone:         raw.reference2Phone ?? raw.reference2_phone,
    verification_method:      raw.verificationMethod ?? raw.verification_method,
    notes:                    raw.notes,
  };
}

export const getClients = async (): Promise<Client[]> => {
  const res = await api.get<Client[]>('/clients');
  return res.data ?? [];
};

export const getClientById = async (id: string | number): Promise<Client> => {
  const res = await api.get<any>(`/clients/${id}`);
  if (!res.success || !res.data) throw new Error('Client not found');
  return mapDbClientToClient(res.data);
};

export const createClient = async (payload: any): Promise<Client> => {
  const res = await api.post<Client>('/clients/register-form', payload);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to create client');
  return res.data;
};

export const updateClient = async (
  id: string | number,
  payload: Partial<Client>,
): Promise<Client> => {
  const res = await api.patch<Client>(`/clients/${id}`, payload);
  if (!res.success || !res.data) throw new Error(res.message ?? 'Failed to update client');
  return res.data;
};

export const deleteClient = async (id: string | number): Promise<void> => {
  await api.delete(`/clients/${id}`);
};

export const ClientAPI = { getClients, getClientById, createClient, updateClient, deleteClient };
export const clientApi = ClientAPI;

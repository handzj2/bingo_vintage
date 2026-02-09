import { Client } from '@/features/clients/client.types';

export const adaptClientFormToPayload = (form: any): Partial<Client> => ({
  first_name: form.firstName.trim(),
  last_name: form.lastName.trim(),
  full_name: `${form.firstName} ${form.lastName}`,

  email: form.email || null,
  phone: form.phone,
  address: form.address,

  nin: form.nin,
  id_number: form.idNumber,

  date_of_birth: form.dateOfBirth,
  gender: form.gender,
  marital_status: form.maritalStatus,
  nationality: form.nationality,

  occupation: form.occupation,
  employment_status: form.employmentStatus,
  monthly_income: Number(form.monthlyIncome) || 0,

  business_name: form.businessName,
  business_type: form.businessType,
  business_address: form.businessAddress,

  bank_name: form.bankName,
  account_number: form.accountNumber,
  bank_branch: form.bankBranch,

  next_of_kin_name: form.nextOfKinName,
  next_of_kin_phone: form.nextOfKinPhone,
  next_of_kin_relationship: form.nextOfKinRelationship,

  city: form.city,
  country: form.country,
  postal_code: form.postalCode,

  status: 'active',
  verified: false,
});

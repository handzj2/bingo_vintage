// src/services/clientFormAdapter.ts

// Define the expected shape of the form data (camelCase)
export interface ClientFormInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nin: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  occupation: string;
  monthlyIncome: number;
  employmentStatus: string;

  // Address
  
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Employment
  employerName: string;
  employerPhone: string;
  employmentType: string;
  yearsEmployed: number;

  // Business
  businessName: string;
  businessType: string;
  businessAddress: string;

  // Next of kin
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelationship: string;
  nextOfKinAddress: string;

  // Bank
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankBranch: string;

  // References
  justification: string;
  altPhone: string;
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string;
  reference2Phone: string;
}

export const toRegisterClientDto = (form: ClientFormInput) => {
  return {
    first_name: form.firstName,
    last_name: form.lastName,
    full_name: `${form.firstName} ${form.lastName}`,
    phone: form.phone,
    email: form.email,
    nin: form.nin,
    date_of_birth: form.dateOfBirth,
    gender: form.gender,
    marital_status: form.maritalStatus,
    occupation: form.occupation,
    monthly_income: Number(form.monthlyIncome),
    employment_status: form.employmentStatus,

    address: {
      street: form.street || "",
      city: form.city || "",
      state: form.state || "",
      postal_code: form.postalCode || "",
      country: form.country || "Uganda",
    },

    employment: {
      employer_name: form.employerName || "",
      employer_phone: form.employerPhone || "",
      employment_type: form.employmentType || "",
      years_employed: Number(form.yearsEmployed || 0),
      monthly_income: Number(form.monthlyIncome || 0),
    },

    business: {
      name: form.businessName || "",
      type: form.businessType || "",
      address: form.businessAddress || "",
    },

    kin: {
      name: form.nextOfKinName,
      phone: form.nextOfKinPhone,
      relationship: form.nextOfKinRelationship,
      address: form.nextOfKinAddress || "",
    },

    bank_details: {
      bank_name: form.bankName || "",
      account_number: form.accountNumber || "",
      account_name: form.accountName || "", // Added
      branch: form.bankBranch || "",
    },

    // Additional fields that map directly to columns
    justification: form.justification || "",
    alt_phone: form.altPhone || "",
    reference1_name: form.reference1Name || "",
    reference1_phone: form.reference1Phone || "",
    reference2_name: form.reference2Name || "",
    reference2_phone: form.reference2Phone || "",
  };
};
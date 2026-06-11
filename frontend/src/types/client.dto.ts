export interface RegisterClientFormDto {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  nin: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  occupation: string;
  monthly_income: number;
  employment_status: string;

  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };

  employment: {
    employer_name: string;
    employer_phone: string;
    employment_type: string;
    years_employed: number;
    monthly_income: number;
  };

  business: {
    name: string;
    type: string;
    address: string;
  };

  kin: {
    name: string;
    phone: string;
    relationship: string;
    address: string;
  };

  bank_details: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch: string;
  };

  justification: string;
  alt_phone: string;
  reference1_name: string;
  reference1_phone: string;
  reference2_name: string;
  reference2_phone: string;
}

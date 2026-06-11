/**
 * shared/api-types.ts — Canonical API contract types.
 *
 * SOURCE OF TRUTH for every request payload and response shape exchanged
 * between the Next.js frontend and the NestJS backend.
 *
 * Rules (Safe Addition Protocol):
 *  • New fields → always optional here until backend ships them.
 *  • Renamed fields → add new name as optional, keep old name, remove old
 *    only after all call sites are migrated.
 *  • Removed fields → mark @deprecated in JSDoc, remove after one release.
 *  • Never change a field's type — add a new field with the new type instead.
 *
 * This file is the contract. A TypeScript error here means a breaking change
 * is about to reach production — stop and coordinate the deploy.
 */

// ─────────────────────────────────────────────────────────────
// ENUMS  (must match backend exactly — tested in CI)
// ─────────────────────────────────────────────────────────────

// LoanStatus values must exactly match the loan_status_enum in PostgreSQL:
// ('PENDING', 'PENDING_APPROVAL', 'ACTIVE', 'DELINQUENT', 'COMPLETED', 'DEFAULTED', 'CANCELLED')
// WRITTEN_OFF is not in the DB enum — add a migration before using it.
export type LoanStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'DELINQUENT'
  | 'COMPLETED'
  | 'DEFAULTED'
  | 'CANCELLED';

export type LoanType = 'cash' | 'bike';

export type PaymentMethod = 'CASH' | 'Momo' | 'BANK_TRANSFER' | 'Airtelmoney';

// Matches backend PaymentStatus enum exactly
export type PaymentStatus =
  | 'COMPLETED'
  | 'REVERSED'
  | 'REVERSAL_REQUESTED'   // cashier has requested; awaiting admin
  | 'PENDING'
  | 'FAILED';

export type ReversalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ScheduleStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export type DrawerStatus = 'open' | 'closed' | 'reconciled';

// ─────────────────────────────────────────────────────────────
// PAGINATED RESPONSE  (cursor-based — matches payments/expenses)
// ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items:      T[];
  nextCursor: number | null;
  count:      number;
}

// ─────────────────────────────────────────────────────────────
// LOAN
// ─────────────────────────────────────────────────────────────

/** Loan as returned by GET /loans and GET /loans/:id */
export interface Loan {
  id:               number;
  loan_number:      string;
  loan_type:        LoanType;
  client_id:        number;
  principal_amount: number;
  interest_rate:    number;
  total_amount:     number;
  balance:          number;
  term_months:      number;
  term_weeks:       number | null;
  weekly_amount:    number | null;
  deposit:          number;
  start_date:       string;
  end_date:         string | null;
  status:           LoanStatus;
  bike_id:          number | null;
  notes:            string | null;
  processing_fee:   number;
  approved_by:      number | null;
  approved_at:      string | null;
  tenant_id:        number;
  branch_id:        number | null;
  created_at:       string;
  updated_at:       string;
  /** Joined relation — present when fetched with relations */
  client?: import('./client-types').Client;
}

/** POST /loans/apply — cash or bike loan via ApplyLoanDto */
export interface ApplyLoanRequest {
  clientId:     number;
  loanType:     LoanType;       // lowercase: 'cash' | 'bike'
  amount:       number;
  months:       number;
  bikeId?:      number;
  interestRate?: number;
  start_date?:  string;         // ISO date string
  notes?:       string;
}

/** POST /loans/:id/approve — AdminApprovalDto */
export interface LoanApprovalRequest {
  action: 'approve' | 'reject';
  reason?: string;
}

/** POST /loans/create-bike-loan — CreateBikeLoanDto */
export interface CreateBikeLoanRequest {
  client_id:           number;
  bike_id?:            number;
  deposit:             number;
  term_weeks:          number;
  interest_rate?:      number;
  principal_amount?:   number;
  weekly_installment?: number;
  notes?:              string;
}

// ─────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────

/** Payment as returned by GET /payments and POST /payments */
export interface Payment {
  id:                number;
  loan_id:           number;
  amount:            number;
  principal_amount:  number;
  interest_amount:   number;
  payment_method:    PaymentMethod;
  payment_date:      string;
  status:            PaymentStatus;
  receipt_number:    string;
  transaction_id:    string | null;
  notes:             string | null;
  collected_by:      string | null;
  schedule_id:       number | null;
  cash_drawer_id:    number | null;
  reversed_at:       string | null;
  reversal_reason:   string | null;
  reversed_by:       string | null;
  reversal_status:   ReversalStatus | null;   // NEW — replaces policyReference flag
  policy_reference:  string | null;
  tenant_id:         number;
  branch_id:         number | null;
  created_at:        string;
  updated_at:        string;
  /** Joined relation */
  loan?: Loan;
}

/** POST /payments — CreatePaymentDto */
export interface CreatePaymentRequest {
  loan_id:         number;
  amount:          number;
  payment_method:  PaymentMethod;
  payment_date?:   string;
  receipt_number?: string;
  transaction_id?: string;
  notes?:          string;
  collected_by?:   string;
  schedule_id?:    number;
  cash_drawer_id?: number;
}

/** POST /payments response */
export interface CreatePaymentResponse {
  message:       string;
  payment:       Payment;
  receiptNumber: string;
  newBalance:    number;
  duplicate?:    boolean;
}

// ─────────────────────────────────────────────────────────────
// LOAN SCHEDULE
// ─────────────────────────────────────────────────────────────

export interface LoanSchedule {
  id:                  number;
  loan_id:             number;
  installment_number:  number;
  due_date:            string;
  amount_due:          number;
  principal_due:       number;
  interest_due:        number;
  amount_paid:         number;
  status:              ScheduleStatus;
  paid_date:           string | null;
  receipt_number:      string | null;
  payment_method:      string | null;
  overdue_days:        number;
  late_fee_amount:     number;
  penalty_amount:      number;
  created_at:          string;
  updated_at:          string;
  // camelCase aliases (entity getters — backend may return either)
  amountDue?:          number;
  amountPaid?:         number;
  installmentNumber?:  number;
  dueDate?:            string;
}

export interface LoanScheduleResponse {
  loan:      Loan;
  summary:   { total: number; paid: number; pending: number; overdue: number };
  schedules: LoanSchedule[];
}

// ─────────────────────────────────────────────────────────────
// EXPENSE
// ─────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id:          number;
  name:        string;
  description: string | null;
  tenant_id:   number;
}

export interface Expense {
  id:             number;
  tenant_id:      number;
  branch_id:      number | null;
  category_id:    number;
  amount:         number;
  description:    string;
  payment_method: string;
  cash_drawer_id: number | null;
  status:         ExpenseStatus;
  created_by_id:  number;
  approved_by_id: number | null;
  approved_at:    string | null;
  created_at:     string;
  updated_at:     string;
  category?:      ExpenseCategory;
}

/** POST /expenses — CreateExpenseDto */
export interface CreateExpenseRequest {
  categoryId:    number;
  amount:        number;
  description:   string;
  paymentMethod: string;
  cashDrawerId?: number;
}

// ─────────────────────────────────────────────────────────────
// CASH DRAWER
// ─────────────────────────────────────────────────────────────

export interface CashDrawer {
  id:               number;
  tenant_id:        number;
  branch_id:        number;
  user_id:          number;
  drawer_date:      string;
  opening_balance:  number;
  current_balance:  number;
  closing_balance:  number | null;
  expected_balance: number | null;
  difference:       number | null;
  status:           DrawerStatus;
  closed_at:        string | null;
  created_at:       string;
  updated_at:       string;
}

/** POST /cash-drawers/open */
export interface OpenDrawerRequest {
  openingBalance: number;
}

/** POST /cash-drawers/close/:id */
export interface CloseDrawerRequest {
  actualCash: number;
}

// ─────────────────────────────────────────────────────────────
// BIKE
// ─────────────────────────────────────────────────────────────

export interface Bike {
  id:                   number;
  model:                string;
  frame_number:         string;
  engine_number?:       string;
  registration_number?: string;
  sale_price:           number;   // DECIMAL — always parse with Number()
  purchase_price:       number;
  status:               'AVAILABLE' | 'LOANED' | 'SOLD' | 'MAINTENANCE';
  assigned_client_id:   number | null;
  tenant_id:            number;
  branch_id:            number | null;
  created_at:           string;
  updated_at:           string;
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id:        number;
    username:  string;
    email:     string;
    roleName:  string;
    tenantId:  number;
    branchId:  number | null;
    mustChangePassword: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// RECONCILIATION
// ─────────────────────────────────────────────────────────────

export interface Reconciliation {
  id:            number;
  tenant_id:     number;
  branch_id:     number | null;
  drawer_id:     number;
  expected_cash: number;
  actual_cash:   number;
  difference:    number;
  reconciled_at: string;
  created_at:    string;
  drawer?:       CashDrawer;
}

/** POST /reconciliation */
export interface CreateReconciliationRequest {
  drawerId:   number;
  actualCash: number;
}

// ─────────────────────────────────────────────────────────────
// CLIENT  (canonical — supersedes features/clients/client.types.ts)
// ─────────────────────────────────────────────────────────────

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
  // Extended fields
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
  employer_name?: string;
  employer_phone?: string;
  employment_type?: string;
  years_employed?: number;
  business_name?: string;
  business_type?: string;
  business_address?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
  next_of_kin_address?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  bank_branch?: string;
  reference1_name?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_phone?: string;
  justification?: string;
  verification_method?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  roleName: string;
  tenantId: number;
  branchId: number | null;
  mustChangePassword: boolean;
}

// ─────────────────────────────────────────────────────────────
// UTILITY  (moved from contract/api.ts)
// ─────────────────────────────────────────────────────────────

/**
 * Format a number as Ugandan Shillings.
 * Centralised here so all components produce identical output.
 */
export function formatUGX(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'UGX 0';
  return `UGX ${Number(amount).toLocaleString('en-UG', { maximumFractionDigits: 0 })}`;
}

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          BINGO VINTAGE FINANCE — MASTER API CONTRACT                ║
 * ║                                                                      ║
 * ║  Single source of truth for ALL request/response shapes.            ║
 * ║  Import from this file in BOTH frontend and backend.                ║
 * ║  Fixes all 18 mismatches identified in the API audit.               ║
 * ║                                                                      ║
 * ║  Usage (frontend):  import { LoginRequest } from '@/contract/api'   ║
 * ║  Usage (backend):   import { LoginRequest } from '../../contract'   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — ENUMS (authoritative values for both sides)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MISMATCH FIX #1
 * Was: frontend used 'cash'|'bank'|'MTNmomo', backend enum used 'CASH'|'Momo'|'BANK_TRANSFER'|'Airtelmoney'
 * Now: one enum, both sides import from here.
 */
export enum PaymentMethod {
  CASH         = 'CASH',
  MOMO         = 'Momo',
  BANK_TRANSFER = 'BANK_TRANSFER',
  AIRTEL_MONEY = 'Airtelmoney',
}

/**
 * MISMATCH FIX #2
 * Was: frontend Payment type had no status field; backend PaymentStatus used ALL_CAPS
 * Now: explicit, shared.
 */
export enum PaymentStatus {
  PENDING   = 'PENDING',
  COMPLETED = 'COMPLETED',
  REVERSED  = 'REVERSED',
  FAILED    = 'FAILED',
}

/**
 * MISMATCH FIX #3
 * Was: frontend Loan type used 'pending'|'approved'|'rejected' (3 values, wrong names)
 *      backend LoanStatus had 7 values including PENDING_APPROVAL, DELINQUENT
 * Now: one enum.
 */
export enum LoanStatus {
  PENDING          = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE           = 'ACTIVE',
  DELINQUENT       = 'DELINQUENT',
  COMPLETED        = 'COMPLETED',
  DEFAULTED        = 'DEFAULTED',
  CANCELLED        = 'CANCELLED',
}

/**
 * MISMATCH FIX #4
 * Was: frontend BikeStatus used 'available'|'assigned'|'sold' — 'assigned' doesn't exist
 *      in backend enum, 'MAINTENANCE' had no frontend equivalent.
 * Now: aligned to backend.
 */
export enum BikeStatus {
  AVAILABLE   = 'AVAILABLE',
  LOANED      = 'LOANED',
  MAINTENANCE = 'MAINTENANCE',
  SOLD        = 'SOLD',
}

/**
 * MISMATCH FIX #5
 * Was: frontend mock users used 'admin'|'cashier'|'agent' strings inconsistently.
 *      Backend UserRole enum also had MANAGER and USER with no frontend equivalent.
 * Now: one enum for all role checks.
 */
export enum UserRole {
  ADMIN   = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  AGENT   = 'agent',
  USER    = 'user',
}

export enum LoanType {
  CASH = 'cash',
  BIKE = 'bike',
}

export enum ScheduleStatus {
  PENDING   = 'pending',
  PAID      = 'paid',
  OVERDUE   = 'overdue',
  PARTIAL   = 'partial',
  WAIVED    = 'waived',
  DEFAULTED = 'defaulted',
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** All entity IDs are integers from the PostgreSQL SERIAL primary key. */
export type EntityId = number;

/** ISO-8601 date-time string, e.g. "2026-01-10T14:30:00.000Z" */
export type ISODateTime = string;

/** ISO date string without time, e.g. "2026-01-10" */
export type ISODate = string;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — STANDARD API WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MISMATCH FIX #6
 * Was: The frontend ApiClient wraps responses in { success, data, message }.
 *      The backend returns raw objects. The frontend then had to unwrap differently
 *      per module — payments.api used result.success, client.api used res.data directly.
 * Now: every endpoint documents the raw backend shape. The ApiClient wrapper is
 *      a frontend concern only; backend never returns { success, data }.
 */
export interface ApiSuccessResponse<T> {
  /** Raw backend payload — what NestJS actually returns */
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

/** Frontend ApiClient wraps ALL responses in this shape (client-side only). */
export interface ClientApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — AUTH  (POST /api/auth/login  |  POST /api/auth/register  |  GET /api/auth/me)
// ─────────────────────────────────────────────────────────────────────────────

// ── 4a. POST /api/auth/login ──────────────────────────────────────────────

export interface LoginRequest {
  /** Accepts either username string or email address */
  username: string;
  password: string;
}

/**
 * MISMATCH FIX #7
 * Was: AuthContext User interface had first_name and last_name, which don't exist
 *      in the backend login response. The code did fullName.split(' ') as a workaround.
 * Now: fullName is the canonical field. Components use a helper to split for display.
 */
export interface AuthUser {
  id: EntityId;
  username: string;
  email: string;
  /** Backend returns camelCase fullName — do NOT expect first_name / last_name */
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

// ── 4b. POST /api/auth/register ──────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;        // min 6 characters
  full_name: string;
  role?: UserRole;         // defaults to UserRole.CASHIER on backend
}

export interface RegisterResponse {
  user: AuthUser;
  access_token: string;
}

// ── 4c. GET /api/auth/me (requires Bearer token) ─────────────────────────

/**
 * MISMATCH FIX #8
 * Was: frontend called GET /auth/me but this endpoint did not exist on the backend.
 *      Every page refresh silently failed to restore the session.
 * Now: this endpoint MUST be added to AuthController. Response shape defined here.
 */
export type GetMeResponse = AuthUser;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MISMATCH FIX #9
 * Was: backend Client entity serialises camelCase (firstName, nextOfKinName, createdAt).
 *      Every frontend type file used snake_case (first_name, next_of_kin_name, created_at).
 *      This caused ~25 undefined reads across client list, detail, and edit pages.
 * Now: all fields are snake_case. Backend MUST apply a snake_case serialiser interceptor
 *      (see solution plan Phase 1, Section 2.2). Frontend types match exactly.
 *
 * MISMATCH FIX #10
 * Was: frontend declared id as string; backend uses integer PK (number).
 * Now: id is EntityId = number.
 */
export interface Client {
  id: EntityId;

  // Identity
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string | null;
  nin: string;
  date_of_birth: ISODate | null;
  gender: string | null;
  marital_status: string | null;
  occupation: string | null;
  monthly_income: number;
  employment_status: string | null;

  // Address (flat — backend flattens nested address object before persisting)
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  nationality: string | null;

  // Employment extras
  employer_name: string | null;
  employer_phone: string | null;
  employment_type: string | null;
  years_employed: number | null;

  // Business
  business_name: string | null;
  business_type: string | null;
  business_address: string | null;

  // Next of kin
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  next_of_kin_address: string | null;

  // Bank details
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  bank_branch: string | null;

  // References & policy
  reference1_name: string | null;
  reference1_phone: string | null;
  reference2_name: string | null;
  reference2_phone: string | null;
  justification: string | null;
  alt_phone: string | null;

  // Financial profile
  credit_score: number | null;
  loan_limit: number | null;
  account_balance: number;

  // System fields
  id_number: string | null;
  tax_id: string | null;
  status: string;
  verified: boolean;
  verification_method: string | null;
  sync_status: string;
  notes: string | null;

  // Metadata
  created_at: ISODateTime;
  updated_at: ISODateTime;

  // Relations (only present when fetched with relations)
  loans?: Loan[];
}

// ── 5a. POST /api/clients/register-form ──────────────────────────────────

export interface CreateClientRequest {
  // Required core fields
  full_name: string;
  phone: string;
  nin: string;

  // Optional basic
  first_name?: string;
  last_name?: string;
  email?: string;
  date_of_birth?: ISODate;
  gender?: string;
  marital_status?: string;
  occupation?: string;
  monthly_income?: number;
  employment_status?: string;

  // Nested objects (backend flattens these)
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };

  employment?: {
    employer_name?: string;
    employer_phone?: string;
    employment_type?: string;
    years_employed?: number;
    monthly_income?: number;
  };

  business?: {
    name?: string;
    type?: string;
    address?: string;
  };

  kin?: {
    name?: string;
    phone?: string;
    relationship?: string;
    address?: string;
  };

  bank_details?: {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    branch?: string;
  };

  // Flat extra fields
  justification?: string;
  alt_phone?: string;
  reference1_name?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_phone?: string;
}

/** Response is the full persisted Client */
export type CreateClientResponse = Client;

// ── 5b. GET /api/clients ─────────────────────────────────────────────────

export type GetClientsResponse = Client[];

// ── 5c. GET /api/clients/:id ─────────────────────────────────────────────

export type GetClientResponse = Client;

// ── 5d. PATCH /api/clients/:id ───────────────────────────────────────────

/**
 * MISMATCH FIX #11
 * Was: updateClient() sent Partial<Client> in snake_case but the backend PATCH
 *      handler called transformClientData() which expected camelCase fullName,
 *      ninNumber etc. Snake_case fields were silently ignored.
 * Now: PATCH sends the same nested shape as POST. Backend handles both.
 */
export type UpdateClientRequest = Partial<CreateClientRequest>;
export type UpdateClientResponse = Client;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — BIKES  (GET /api/bikes  |  POST /api/bikes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MISMATCH FIX #12
 * Was: frontend Bike type id was string; BikeStatus was 'available'|'assigned'|'sold'
 *      ('assigned' doesn't exist in backend, 'MAINTENANCE' had no frontend equivalent).
 *      All bike API functions were mock-only (MOCK_BIKES array, never hit backend).
 * Now: id is number, status uses the BikeStatus enum above.
 */
export interface Bike {
  id: EntityId;
  model: string;
  frame_number: string;
  engine_number: string | null;
  registration_number: string | null;
  sale_price: number;
  purchase_price: number;
  status: BikeStatus;
  assigned_client_id: EntityId | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── 6a. GET /api/bikes ───────────────────────────────────────────────────

export type GetBikesResponse = Bike[];

// ── 6b. POST /api/bikes ──────────────────────────────────────────────────

/**
 * MISMATCH FIX #13
 * Was: backend CreateBikeDto only accepted bike_name and model.
 *      frame_number is a required UNIQUE column on the entity — new bikes
 *      could never be fully registered through this endpoint.
 * Now: all required entity fields are listed. Backend DTO must be updated to match.
 */
export interface CreateBikeRequest {
  model: string;
  frame_number: string;           // UNIQUE — required
  sale_price: number;
  purchase_price: number;
  engine_number?: string;         // UNIQUE when provided
  registration_number?: string;   // UNIQUE when provided
  status?: BikeStatus;            // defaults to AVAILABLE
}

export type CreateBikeResponse = Bike;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — LOANS
// ─────────────────────────────────────────────────────────────────────────────

export interface LoanScheduleItem {
  id: EntityId;
  loan_id: EntityId;
  installment_number: number;
  due_date: ISODate;
  principal_amount: number;
  interest_amount: number;
  total_due: number;
  paid_amount: number;
  penalty_amount: number;
  late_fee_amount: number;
  paid_date: ISODate | null;
  payment_method: string | null;
  receipt_number: string | null;
  status: ScheduleStatus;
  overdue_days: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/**
 * MISMATCH FIX #14 (partial)
 * Was: frontend Loan type had only 5 fields (id, amount, interestRate, term, status)
 *      with wrong status values ('pending'|'approved'|'rejected').
 *      backend Loan entity had 30+ fields. LoanTab.tsx accessed loan.client_name
 *      which doesn't exist on the entity (it's a relation).
 * Now: full shape with relation fields included.
 */
export interface Loan {
  id: EntityId;
  loan_number: string;

  // Relations (snake_case after interceptor)
  client_id: EntityId;
  client?: Pick<Client, 'id' | 'first_name' | 'last_name' | 'full_name' | 'phone'>;
  bike_id: EntityId | null;
  bike?: Pick<Bike, 'id' | 'model' | 'frame_number' | 'sale_price'> | null;

  // Financial
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  balance: number;
  processing_fee: number;
  term_months: number;

  // Dates
  start_date: ISODate;
  end_date: ISODate | null;

  // Status
  status: LoanStatus;
  loan_type?: LoanType;

  // Audit
  approved_by: EntityId | null;
  approved_at: ISODateTime | null;
  created_by: EntityId | null;
  deleted_by: EntityId | null;
  deleted_at: ISODateTime | null;

  notes: string | null;

  // Relations (populated when fetched with relations)
  payments?: Payment[];
  schedules?: LoanScheduleItem[];

  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── 7a. GET /api/loans ───────────────────────────────────────────────────

export type GetLoansResponse = Loan[];

// ── 7b. POST /api/loans/apply  (cash loans) ──────────────────────────────

/**
 * MISMATCH FIX #15 — THE BIGGEST ONE
 * Was: frontend posted to POST /loans (does not exist).
 *      Correct path is POST /loans/apply.
 *      Field names were ALL wrong:
 *        client_id    →  clientId   (camelCase on ApplyLoanDto)
 *        term_period  →  months
 *        principal_amount → amount
 *      loan_type was sent but not in ApplyLoanDto (silently ignored).
 * Now: correct path and correct field names.
 */
export interface ApplyCashLoanRequest {
  clientId: EntityId;     // camelCase — matches ApplyLoanDto on backend
  amount: number;         // was principal_amount
  months: number;         // was term_period
  interestRate?: number;  // decimal, e.g. 0.15 for 15%
  bikeId?: EntityId;      // optional — links to a bike record
}

export type ApplyCashLoanResponse = Loan;

// ── 7c. POST /api/loans/create-bike-loan  (bike loans) ───────────────────

/**
 * MISMATCH FIX #16
 * Was: frontend always posted to /loans regardless of loan type.
 *      Bike loans have a completely different endpoint and shape.
 * Now: bike loans go to /loans/create-bike-loan with this shape.
 */
export interface CreateBikeLoanRequest {
  client_id: EntityId;
  bike_id: EntityId;
  deposit: number;
  term_weeks: number;
  interest_rate?: number;
  policy_reference?: string;
}

export type CreateBikeLoanResponse = Loan;

// ── 7d. GET /api/loans/:id ───────────────────────────────────────────────

export type GetLoanResponse = Loan;

// ── 7e. POST /api/loans/:id/approve ─────────────────────────────────────

export interface ApproveLoanRequest {
  status: 'approved' | 'rejected' | 'pending_approval';
  comments?: string;
  policy_reference: string;
}

// ── 7f. POST /api/loans/cash/calculate ───────────────────────────────────

export interface CashLoanCalculateRequest {
  amount: number;
  term_months: number;   // was termMonths on CashLoanCalculateDto — backend uses camelCase internally
  interest_rate: number; // annual rate as decimal
  start_date?: ISODate;
}

export interface LoanCalculationResult {
  principal: number;
  total_interest: number;
  total_payable: number;
  monthly_installment: number;
  term_months: number;
  interest_rate: number;
}

// ── 7g. POST /api/loans/bike/calculate ───────────────────────────────────

export interface BikeLoanCalculateRequest {
  sale_price: number;     // maps to salePrice on BikeLoanCalculateDto
  deposit: number;
  weekly_installment?: number;
  target_weeks?: number;
  cost_price?: number;    // admin only
}

export interface BikeLoanCalculationResult {
  principal: number;
  deposit: number;
  weekly_installment: number;
  total_weeks: number;
  total_payable: number;
}

// ── 7h. GET /api/loans/reports/summary ───────────────────────────────────

export interface LoanPortfolioSummary {
  total_loans: number;
  active_loans: number;
  pending_approval: number;
  delinquent_loans: number;
  completed_loans: number;
  total_portfolio_value: number;
  total_outstanding: number;
  total_collected: number;
  portfolio_at_risk: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — PAYMENTS  (POST /api/payments  |  GET /api/payments)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MISMATCH FIX #17 — CRITICAL PATH
 * Was:
 *   (a) frontend called GET /repayments/ — does not exist, should be GET /payments
 *   (b) frontend called POST /repayments/ — does not exist, should be POST /payments
 *   (c) required field receipt_number was never sent by frontend
 *   (d) required field payment_date was never sent by frontend
 *   (e) frontend sent loan_type and justification — not in CreatePaymentDto, silently ignored
 *   (f) frontend sent recorded_by (number) — backend expects collected_by (string)
 *   (g) payment_method enum values didn't match ('cash' vs 'CASH', 'MTNmomo' vs 'Momo')
 * Now: correct endpoint (handled by ApiClient base URL), correct fields.
 */
export interface Payment {
  id: EntityId;
  loan_id: EntityId;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_method: PaymentMethod;
  receipt_number: string;
  payment_date: ISODateTime;
  status: PaymentStatus;
  transaction_id: string | null;
  notes: string | null;
  collected_by: string | null;
  schedule_id: EntityId | null;
  idempotency_key: string | null;
  reversed_at: ISODateTime | null;
  reversal_reason: string | null;
  reversed_by: string | null;
  policy_reference: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── 8a. POST /api/payments ───────────────────────────────────────────────

export interface CreatePaymentRequest {
  loan_id: EntityId;
  amount: number;
  payment_method: PaymentMethod;

  /**
   * receipt_number is required by the backend DTO but can be auto-generated
   * server-side if the backend is updated to make it optional.
   * Generate client-side as: `RCT-${Date.now()}` until backend auto-generates.
   */
  receipt_number: string;

  /**
   * payment_date defaults to now on the backend if omitted.
   * Send as ISO string: new Date().toISOString()
   */
  payment_date?: ISODateTime;

  transaction_id?: string;
  notes?: string;
  collected_by?: string;  // was recorded_by (number) — now string (username or id.toString())
  schedule_id?: EntityId;
}

export type CreatePaymentResponse = Payment;

// ── 8b. GET /api/payments ────────────────────────────────────────────────

export type GetPaymentsResponse = Payment[];

// ── 8c. GET /api/payments/loan/:loanId ───────────────────────────────────

export type GetPaymentsByLoanResponse = Payment[];

// ── 8d. POST /api/payments/:id/reverse  (admin only) ─────────────────────

export interface ReversePaymentRequest {
  reason: string;
}

export type ReversePaymentResponse = Payment;

// ── 8e. GET /api/payments/summary ────────────────────────────────────────

export interface PaymentSummary {
  total_payments: number;
  total_amount: number;
  today_amount: number;
  today_count: number;
  reversed_count: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — USERS  (admin-managed staff accounts)
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: EntityId;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  sync_status: string;
  last_login: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── 9a. POST /api/users ──────────────────────────────────────────────────

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;   // min 6 characters
  full_name: string;  // maps to full_name on CreateUserDto
  role?: UserRole;
}

// ── 9b. PATCH /api/users/:id ─────────────────────────────────────────────

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

// ── 9c. PUT /api/users/:id/change-password ────────────────────────────────

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — SETTINGS  (GET /api/settings  |  PATCH /api/settings/:key)
// ─────────────────────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
}

export type GetSettingsResponse = AppSetting[];

export interface UpdateSettingRequest {
  value: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export interface DailySummaryReport {
  date: ISODate;
  total_collected: number;
  payment_count: number;
  by_method: Record<PaymentMethod, number>;
}

export interface ArrearsReport {
  loan_id: EntityId;
  loan_number: string;
  client_name: string;
  client_phone: string;
  outstanding_balance: number;
  overdue_amount: number;
  days_overdue: number;
  status: LoanStatus;
}

export type GetArrearsResponse = ArrearsReport[];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — UTILITY HELPERS (frontend only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split fullName into display parts without mutating the canonical field.
 * Use this in components instead of storing first_name / last_name.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName ?? '').trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Generate a client-side receipt number.
 * Use this until backend auto-generates receipt_number.
 */
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `RCT-${year}-${rand}`;
}

/**
 * MISMATCH FIX #18 — ID coercion
 * Was: frontend stored all IDs as strings, backend ParseIntPipe expects numbers.
 *      Sending a non-numeric string to /clients/:id caused 400 Bad Request.
 * Now: always convert to number before use in API calls.
 */
export function toEntityId(value: string | number | null | undefined): EntityId | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

/** Format UGX amounts for display */
export function formatUGX(amount: number | null | undefined): string {
  if (amount == null) return 'UGX 0';
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Get the display name for a loan from its client relation */
export function getLoanClientName(loan: Loan): string {
  if (loan.client?.full_name) return loan.client.full_name;
  if (loan.client) return `${loan.client.first_name} ${loan.client.last_name}`.trim();
  return `Loan ${loan.loan_number}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13 — ENDPOINT MAP (documentation, not runtime)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical endpoint paths relative to NEXT_PUBLIC_API_URL.
 * Import ENDPOINTS.X in API service files to eliminate hard-coded strings.
 *
 * MISMATCH FIXES APPLIED IN PATHS:
 *   - /repayments/ → /payments              (fixes #17a, #17b)
 *   - /loans       → /loans/apply           (fixes #15)
 *   - (new)          /loans/create-bike-loan (fixes #16)
 *   - (new)          /auth/me               (fixes #8)
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN:    '/auth/login',
    REGISTER: '/auth/register',
    ME:       '/auth/me',
  },
  CLIENTS: {
    LIST:           '/clients',
    CREATE:         '/clients/register-form',
    GET:    (id: EntityId) => `/clients/${id}`,
    UPDATE: (id: EntityId) => `/clients/${id}`,
    DELETE: (id: EntityId) => `/clients/${id}`,
  },
  BIKES: {
    LIST:   '/bikes',
    CREATE: '/bikes',
    GET:    (id: EntityId) => `/bikes/${id}`,
    UPDATE: (id: EntityId) => `/bikes/${id}`,
  },
  LOANS: {
    LIST:            '/loans',
    APPLY_CASH:      '/loans/apply',
    APPLY_BIKE:      '/loans/create-bike-loan',
    GET:   (id: EntityId) => `/loans/${id}`,
    APPROVE: (id: EntityId) => `/loans/${id}/approve`,
    REVERSE: (id: EntityId) => `/loans/${id}/reverse`,
    CALC_CASH:      '/loans/cash/calculate',
    CALC_BIKE:      '/loans/bike/calculate',
    REPORTS: {
      SUMMARY: '/loans/reports/summary',
      OVERDUE: '/loans/reports/overdue',
      AUDIT:   (loanId: EntityId) => `/loans/reports/audit/${loanId}`,
    },
  },
  PAYMENTS: {
    LIST:    '/payments',
    CREATE:  '/payments',
    GET:     (id: EntityId) => `/payments/${id}`,
    BY_LOAN: (loanId: EntityId) => `/payments/loan/${loanId}`,
    REVERSE: (id: EntityId) => `/payments/${id}/reverse`,
    SUMMARY: '/payments/summary',
    TODAY:   '/payments/today',
  },
  USERS: {
    LIST:            '/users',
    CREATE:          '/users',
    GET:    (id: EntityId) => `/users/${id}`,
    UPDATE: (id: EntityId) => `/users/${id}`,
    CHANGE_PASSWORD: (id: EntityId) => `/users/${id}/change-password`,
    DEACTIVATE:      (id: EntityId) => `/users/${id}/deactivate`,
    ACTIVATE:        (id: EntityId) => `/users/${id}/activate`,
  },
  REPORTS: {
    DAILY_SUMMARY: '/reports/daily-summary',
    ARREARS:       '/reports/arrears',
  },
  SETTINGS: {
    LIST:   '/settings',
    UPDATE: (key: string) => `/settings/${key}`,
  },
} as const;

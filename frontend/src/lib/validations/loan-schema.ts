// src/lib/validations/loan-schema.ts
import { z } from 'zod';

// 1. Define Enums
export const LoanTypeEnum = z.enum(['cash', 'bike', 'asset', 'emergency']);
export type LoanType = z.infer<typeof LoanTypeEnum>;

export const DisbursementMethodEnum = z.enum(['MTNMomo', 'bank', 'cash', 'airtelMoney']);
export type DisbursementMethod = z.infer<typeof DisbursementMethodEnum>;

// 2. ID Schema - Accepts both string and number (for API and mock data)
export const IdSchema = z.union([
  z.coerce.number().positive('ID must be valid'),
  z.string().min(1, 'ID must be valid')
]);

// 3. Optional ID Schema for nullable fields
export const OptionalIdSchema = IdSchema.nullable().optional();

// 4. Define the BASE Object 
export const baseLoanSchema = z.object({
  type: LoanTypeEnum,
  client_id: IdSchema,
  // UPDATED: Base minimum set to 1 to allow any value before refinement
  loan_amount: z.coerce
    .number()
    .min(1, 'Amount must be greater than zero')
    .max(100000000, 'Maximum loan amount exceeded'), 
  interest_rate: z.coerce
    .number()
    .min(0.1, 'Minimum interest rate is 0.1%')
    .max(100, 'Maximum interest rate is 100%'),
  period_months: z.coerce
    .number()
    .int('Must be a whole number')
    .min(1, 'Minimum period is 1 month')
    .max(60, 'Maximum period is 60 months'),
  purpose: z.string().min(2, 'Purpose must be at least 2 characters'),
  start_date: z.string().min(1, 'Start date is required'),
  disbursement_method: DisbursementMethodEnum,
  bike_id: OptionalIdSchema,
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

// 3. Create the partial schema from the BASE (For the Edit Page)
export const loanUpdateSchema = baseLoanSchema.partial();

// 4. Create the refined schema (For the Create Page)
export const loanSchema = baseLoanSchema.superRefine(
  (data, ctx) => {
    // RULE 1: If it's a bike loan, bike_id must be present
    if (data.type === 'bike' && !data.bike_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bike loans require a bike selection",
        path: ["bike_id"],
      });
    }

    // RULE 2: If it's a cash loan, enforce 10,000 minimum
    if (data.type === 'cash' && data.loan_amount < 10000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum cash loan amount is UGX 10,000",
        path: ["loan_amount"],
      });
    }

    // RULE 3: Cash loans should not have a bike assigned
    if (data.type === 'cash' && data.bike_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cash loans should not have a bike assigned",
        path: ["bike_id"],
      });
    }
  }
);

// 5. Types
export type LoanFormData = z.infer<typeof baseLoanSchema>;
export type LoanUpdateData = z.infer<typeof loanUpdateSchema>;

// 6. Helper function to ensure ID is string for consistency
export function ensureStringId(id: string | number | null | undefined): string {
  if (id === null || id === undefined || id === '') return '';
  return typeof id === 'number' ? id.toString() : id;
}

// 7. Helper function to check if ID is valid
export function isValidId(id: string | number | null | undefined): boolean {
  if (id === null || id === undefined || id === '') return false;
  const strId = ensureStringId(id);
  return strId.length > 0;
}

// 8. EMI Calculation Function - UPDATED to Math.round for UGX
export function calculateEMI(loan_amount: number, interest_rate: number, period_months: number): number {
  const monthlyRate = interest_rate / 12 / 100;
  if (monthlyRate === 0) return Math.round(loan_amount / period_months);
  
  const emi = (loan_amount * monthlyRate * Math.pow(1 + monthlyRate, period_months)) / 
              (Math.pow(1 + monthlyRate, period_months) - 1);
  return Math.round(emi);
}

// 9. Total Amount Calculation - UPDATED for UGX Standard
export function calculateTotalAmount(emi: number, period_months: number): number {
  return Math.round(emi * period_months);
}

// 10. Total Interest Calculation - UPDATED for UGX Standard
export function calculateTotalInterest(totalAmount: number, loan_amount: number): number {
  return Math.round(totalAmount - loan_amount);
}
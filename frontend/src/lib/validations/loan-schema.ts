import { z } from 'zod';

export const LoanTypeSchema = z.enum(['cash', 'bike']);
export type LoanType = z.infer<typeof LoanTypeSchema>;

export const CashLoanSchema = z.object({
  loan_type:        z.literal('cash'),
  client_id:        z.number().int().positive(),
  principal_amount: z.number().positive(),
  interest_rate:    z.number().min(0).max(1),
  term_period:      z.number().int().positive(),
  start_date:       z.string(),
  notes:            z.string().min(15, 'Audit justification must be at least 15 characters'),
});

export const BikeLoanSchema = z.object({
  loan_type:        z.literal('bike'),
  client_id:        z.number().int().positive(),
  bike_id:          z.number().int().positive(),
  principal_amount: z.number().positive(),
  deposit_amount:   z.number().min(0).default(0),
  interest_rate:    z.number().min(0).max(1),
  term_period:      z.number().int().positive(),
  start_date:       z.string(),
  notes:            z.string().min(15, 'Audit justification must be at least 15 characters'),
});

export const LoanSchema = z.discriminatedUnion('loan_type', [CashLoanSchema, BikeLoanSchema]);
export type LoanFormData = z.infer<typeof LoanSchema>;

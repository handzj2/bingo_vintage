/**
 * Typed interfaces for payment-related data flows.
 * Replaces `any` casts in PaymentsService and LoansService.
 *
 * Pattern: Stripe TypeScript SDK — every object crossing a service
 * boundary has a named interface. Renames/removals caught at compile
 * time, not at runtime in production.
 */

export interface LoanRow {
  id:         number;
  balance:    string | number;   // pg driver returns DECIMAL as string
  status:     string;
  bikeId:     number | null;
  tenantId:   number | null;
  branchId:   number | null;
  clientId:   number;
  loanNumber: string;
}

export interface ScheduleRow {
  id:          number;
  amount_due:  string | number;
  amount_paid: string | number;
  status:      string;
}

export interface ReversalActor {
  id?:       number;
  email?:    string;
  username?: string;
}

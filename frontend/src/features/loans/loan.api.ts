import { api } from '@/lib/api/client';
import type { Loan, ApplyLoanRequest, LoanApprovalRequest, CreateBikeLoanRequest } from '@/shared/api-types';

/**
 * PHASE 5 — loan.api.ts
 * Fixed:
 *  • approveLoan: PATCH→POST (controller uses @Post(':id/approve'))
 *  • rejectLoan:  PATCH /reject → POST /approve with status:'rejected' in body
 */
export const loanApi = {
  getLoans:    ()                       => api.get<Loan[]>('/loans'),
  getLoan:     (id: number | string)    => api.get<Loan>(`/loans/${id}`),
  applyCash:   (payload: ApplyLoanRequest) => api.post<Loan>('/loans/apply', payload),
  applyBike:   (payload: any)           => api.post('/loans/apply', payload),

  // Task 4.4: aligned to AdminApprovalDto — action:'approve'/'reject' + reason?
  approveLoan: (id: number | string, reason?: string) =>
    api.post(`/loans/${id}/approve`, {
      action: 'approve', reason,
    }),

  rejectLoan: (id: number | string, reason: string) =>
    api.post(`/loans/${id}/approve`, {
      action: 'reject', reason,
    }),

  deleteLoan: (id: number | string) => api.delete(`/loans/${id}`),
};

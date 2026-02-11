import { api } from '@/lib/api/client';

export const loanApi = {
  // Get all loans - ADD THIS
  getLoans: async () => {
    return await api.get('/loans');
  },

  // Matches your @Post() in loans.controller.ts
  createLoan: async (loanData: any) => {
    return await api.post('/loans', loanData);
  },

  // Matches your @Get('reports/overdue')
  getOverdueReport: async () => {
    return await api.get('/loans/reports/overdue');
  },

  // Matches @Get(':id')
  getLoanDetails: async (id: string) => {
    return await api.get(`/loans/${id}`);
  }
};

// Export individual functions for convenience
export const { getLoans, createLoan, getOverdueReport, getLoanDetails } = loanApi;
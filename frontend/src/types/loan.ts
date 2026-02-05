export interface Loan {
  id: string
  amount: number
  interestRate: number
  term: number
  status: 'pending' | 'approved' | 'rejected'
}
import { User } from './user'
import { Loan } from './loan'

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export type UserResponse = ApiResponse<User>
export type LoanResponse = ApiResponse<Loan>
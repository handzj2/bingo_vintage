import { CreateLoanDto } from './create-loan.dto';
import { LoanStatus } from '../entities/loan.entity';
declare const UpdateLoanDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateLoanDto>>;
export declare class UpdateLoanDto extends UpdateLoanDto_base {
    balance?: number;
    completed_at?: Date;
    status?: LoanStatus;
    notes?: string;
}
export {};

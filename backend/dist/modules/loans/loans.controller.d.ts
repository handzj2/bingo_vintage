import { LoansService } from './loans.service';
import { BikeLoanCalculateDto } from './dto/bike-loan-calculate.dto';
import { BikesService } from '../bikes/bikes.service';
export declare class AdminApprovalDto {
    status: string;
    comments?: string;
    policyReference: string;
}
export declare class CreateBikeLoanDto {
    client_id: number;
    bike_id: number;
    deposit: number;
    term_weeks: number;
    interest_rate?: number;
    policyReference?: string;
}
export declare class ApplyLoanDto {
    clientId: number;
    bikeId: number;
    amount: number;
    months: number;
    interestRate?: number;
}
export declare class CashLoanCalculateDto {
    amount: number;
    termMonths: number;
    interestRate: number;
    startDate?: string;
}
export declare class AdminReversalDto {
    reason: string;
    newBalance: number;
    reversalType: string;
    amount: number;
    policyReference: string;
    changes?: Record<string, any>;
}
export declare class UpdateLoanDto {
    details?: string;
    amount?: number;
    policyReference: string;
}
export declare class SearchLoansDto {
    loanNumber?: string;
    clientName?: string;
    status?: string;
    loanType?: string;
    startDate?: string;
    endDate?: string;
}
export declare class LoansController {
    private readonly loansService;
    private readonly bikesService;
    constructor(loansService: LoansService, bikesService: BikesService);
    apply(data: ApplyLoanDto, req: any): Promise<import("./entities/loan.entity").Loan>;
    findOne(id: number): Promise<import("./entities/loan.entity").Loan>;
    findAll(status?: string, type?: string, startDate?: string, endDate?: string): Promise<import("./entities/loan.entity").Loan[]>;
    searchLoans(searchDto: SearchLoansDto): Promise<import("./entities/loan.entity").Loan[]>;
    calculateCashLoan(data: CashLoanCalculateDto): Promise<{
        success: boolean;
        data: {
            loanAmount: number;
            termMonths: number;
            interestRate: number;
            monthlyPayment: number;
            totalPayable: number;
            totalInterest: number;
            schedule: any[];
            policy: {
                model: string;
                reference: string;
                description: string;
                calculation: {
                    formula: string;
                    example: string;
                    totalInterest: number;
                    monthlyBreakdown: string;
                };
            };
        };
    }>;
    calculateBikeLoan(data: BikeLoanCalculateDto): Promise<{
        success: boolean;
        data: {
            salePrice: number;
            deposit: number;
            weeklyInstallment: number;
            weeksToPay: number;
            totalPayable: number;
            estimatedMonths: number;
            paymentSchedule: any[];
            adminData: any;
        };
    }>;
    previewBikeLoan(salePrice: string, deposit: string, targetWeeks?: string, targetMonthly?: string): Promise<{
        success: boolean;
        data: {
            salePrice: number;
            deposit: number;
            weeklyInstallment: number;
            weeksToPay: number;
            totalPayable: number;
            estimatedMonths: number;
            paymentSchedule: any[];
            adminData: any;
        };
    }>;
    createBikeLoan(bikeLoanDto: CreateBikeLoanDto): Promise<{
        success: boolean;
        data: {
            loan: import("./entities/loan.entity").Loan;
            summary: {
                bikePrice: number;
                deposit: any;
                principalAmount: number;
                weeklyInstallment: number;
                totalWeeks: any;
                totalPayable: number;
            };
        };
    }>;
    approveLoan(id: number, approvalDto: AdminApprovalDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/loan.entity").Loan;
        audit: string;
    }>;
    reverseLoan(id: number, reversalDto: AdminReversalDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            loanId: number;
            previousBalance: number;
            newBalance: any;
            status: import("./entities/loan.entity").LoanStatus;
            adminId: any;
            timestamp: Date;
            auditNote: string;
        };
    }>;
    updateLoan(id: number, updateDto: UpdateLoanDto, req: any): Promise<any>;
    deleteLoan(id: number, req: any): Promise<import("./entities/loan.entity").Loan>;
    updateLoanStatus(id: number, status: string, req: any): Promise<import("./entities/loan.entity").Loan>;
    getPortfolioSummary(req: any): Promise<{
        totalLoans: number;
        activeLoans: number;
        pendingLoans: number;
        overdueLoans: number;
        totalPortfolioValue: any;
        generatedAt: Date;
        generatedBy: any;
    }>;
    getOverdueLoansReport(): Promise<{
        id: number;
        loanNumber: string;
        clientName: string;
        amount: number;
        balance: number;
        daysOverdue: number;
        status: import("./entities/loan.entity").LoanStatus;
    }[]>;
    getLoanAuditTrail(loanId: number, req: any): Promise<{
        loanId: number;
        loanNumber: string;
        auditTrail: any[];
    }>;
}

import { Repository } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Client } from '../clients/entities/client.entity';
import { LoanSchedule } from './entities/schedule.entity';
import { Bike } from '../bikes/entities/bike.entity';
import { SettingsService } from '../settings/settings.service';
import { ApplyLoanDto } from './loans.controller';
import { BikeLoanCalculateDto } from './dto/bike-loan-calculate.dto';
import { CashLoanCalculateDto } from './loans.controller';
import { BikesService } from '../bikes/bikes.service';
import { User } from '../auth/entities/user.entity';
export declare class LoansService {
    private loansRepo;
    private clientsRepo;
    private scheduleRepo;
    private bikesRepo;
    private settingsService;
    private bikesService;
    constructor(loansRepo: Repository<Loan>, clientsRepo: Repository<Client>, scheduleRepo: Repository<LoanSchedule>, bikesRepo: Repository<Bike>, settingsService: SettingsService, bikesService: BikesService);
    private calculateFlatInterest;
    applyForLoan(data: ApplyLoanDto, user: any): Promise<Loan>;
    private generateMonthlySchedule;
    findOne(id: number): Promise<Loan>;
    getLoanSummary(amount: number, months?: number): Promise<{
        principal: number;
        interest_rate: number;
        processing_fee: number;
        term_months: number;
        monthly_payment: number;
        total_amount: number;
        total_interest: number;
        settings_applied: {
            interest_rate: number;
            processing_fee: number;
            term: number;
        };
    }>;
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
    previewBikeLoan(data: {
        salePrice: number;
        deposit: number;
        targetWeeks?: number;
        targetMonthly?: number;
    }): Promise<{
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
    create(createLoanDto: any): Promise<{
        success: boolean;
        data: {
            loan: Loan;
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
    remove(id: number, user: User): Promise<{
        success: boolean;
        message: string;
        deletedAt: Date;
    }>;
    updateLoan(id: number, updateLoanDto: any, user: any): Promise<any>;
    reverseOrAdjustLoan(id: number, data: any, user: any): Promise<{
        success: boolean;
        message: string;
        data: {
            loanId: number;
            previousBalance: number;
            newBalance: any;
            status: LoanStatus;
            adminId: any;
            timestamp: Date;
            auditNote: string;
        };
    }>;
    reverseOrAdjustLoanDetailed(loanId: number, adjustmentData: any, adminUser: any): Promise<{
        success: boolean;
        message: string;
        data: {
            loanId: number;
            previousBalance: number;
            newBalance: any;
            difference: number;
            adjustmentType: string;
            adminUserId: any;
            timestamp: Date;
            auditEntry: string;
        };
    }>;
    findAll(filters: {
        status?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<Loan[]>;
    searchLoans(searchDto: any): Promise<Loan[]>;
    approveOrRejectLoan(id: number, dto: any, admin: any): Promise<{
        success: boolean;
        message: string;
        data: Loan;
        audit: string;
    }>;
    updateLoanStatus(id: number, status: string, user: any): Promise<Loan>;
    softDeleteLoan(id: number, user: any): Promise<Loan>;
    getPortfolioSummary(user: any): Promise<{
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
        status: LoanStatus;
    }[]>;
    getLoanAuditTrail(loanId: number): Promise<{
        loanId: number;
        loanNumber: string;
        auditTrail: any[];
    }>;
    private calculateDaysOverdue;
    private parseAuditEntry;
}

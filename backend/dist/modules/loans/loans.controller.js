"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoansController = exports.SearchLoansDto = exports.UpdateLoanDto = exports.AdminReversalDto = exports.CashLoanCalculateDto = exports.ApplyLoanDto = exports.CreateBikeLoanDto = exports.AdminApprovalDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const loans_service_1 = require("./loans.service");
const bike_loan_calculate_dto_1 = require("./dto/bike-loan-calculate.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const bikes_service_1 = require("../bikes/bikes.service");
class AdminApprovalDto {
}
exports.AdminApprovalDto = AdminApprovalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'approved',
        description: 'Approval status',
        enum: ['approved', 'rejected', 'pending_approval']
    }),
    __metadata("design:type", String)
], AdminApprovalDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Loan meets all requirements',
        description: 'Approval comments',
        required: false
    }),
    __metadata("design:type", String)
], AdminApprovalDto.prototype, "comments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2026-01-10',
        description: 'Policy reference for audit trail'
    }),
    __metadata("design:type", String)
], AdminApprovalDto.prototype, "policyReference", void 0);
class CreateBikeLoanDto {
}
exports.CreateBikeLoanDto = CreateBikeLoanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Client ID' }),
    __metadata("design:type", Number)
], CreateBikeLoanDto.prototype, "client_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Bike ID' }),
    __metadata("design:type", Number)
], CreateBikeLoanDto.prototype, "bike_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3000000, description: 'Deposit amount' }),
    __metadata("design:type", Number)
], CreateBikeLoanDto.prototype, "deposit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 104, description: 'Loan term in weeks' }),
    __metadata("design:type", Number)
], CreateBikeLoanDto.prototype, "term_weeks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.1, description: 'Interest rate (if applicable)', required: false }),
    __metadata("design:type", Number)
], CreateBikeLoanDto.prototype, "interest_rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-10', description: 'Policy reference' }),
    __metadata("design:type", String)
], CreateBikeLoanDto.prototype, "policyReference", void 0);
class ApplyLoanDto {
}
exports.ApplyLoanDto = ApplyLoanDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], ApplyLoanDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], ApplyLoanDto.prototype, "bikeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000000 }),
    __metadata("design:type", Number)
], ApplyLoanDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], ApplyLoanDto.prototype, "months", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.15, required: false }),
    __metadata("design:type", Number)
], ApplyLoanDto.prototype, "interestRate", void 0);
class CashLoanCalculateDto {
}
exports.CashLoanCalculateDto = CashLoanCalculateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000000, description: 'Loan amount' }),
    __metadata("design:type", Number)
], CashLoanCalculateDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12, description: 'Loan term in months' }),
    __metadata("design:type", Number)
], CashLoanCalculateDto.prototype, "termMonths", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.15, description: 'Annual interest rate' }),
    __metadata("design:type", Number)
], CashLoanCalculateDto.prototype, "interestRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01',
        description: 'Loan start date (optional)',
        required: false
    }),
    __metadata("design:type", String)
], CashLoanCalculateDto.prototype, "startDate", void 0);
class AdminReversalDto {
}
exports.AdminReversalDto = AdminReversalDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Customer made advance payment, waiving late fee',
        description: 'Reason for the reversal'
    }),
    __metadata("design:type", String)
], AdminReversalDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5000000,
        description: 'New balance after reversal'
    }),
    __metadata("design:type", Number)
], AdminReversalDto.prototype, "newBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'late_fee_reversal',
        description: 'Type of reversal',
        enum: ['late_fee_reversal', 'interest_adjustment', 'term_extension', 'principal_reduction', 'other']
    }),
    __metadata("design:type", String)
], AdminReversalDto.prototype, "reversalType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5000,
        description: 'Amount to be reversed/adjusted'
    }),
    __metadata("design:type", Number)
], AdminReversalDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2026-01-10',
        description: 'Policy reference for the reversal'
    }),
    __metadata("design:type", String)
], AdminReversalDto.prototype, "policyReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: { old_status: 'delinquent', new_status: 'active' },
        description: 'Detailed changes being made',
        required: false
    }),
    __metadata("design:type", Object)
], AdminReversalDto.prototype, "changes", void 0);
class UpdateLoanDto {
}
exports.UpdateLoanDto = UpdateLoanDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'updated loan details',
        description: 'Updated loan information',
        required: false
    }),
    __metadata("design:type", String)
], UpdateLoanDto.prototype, "details", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5500000,
        description: 'Updated loan amount',
        required: false
    }),
    __metadata("design:type", Number)
], UpdateLoanDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2026-01-10',
        description: 'Policy reference for update'
    }),
    __metadata("design:type", String)
], UpdateLoanDto.prototype, "policyReference", void 0);
class SearchLoansDto {
}
exports.SearchLoansDto = SearchLoansDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'LN-2024-001',
        description: 'Search by loan number',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "loanNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'John',
        description: 'Search by client name',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'active',
        description: 'Filter by status',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'cash',
        description: 'Filter by loan type',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "loanType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01',
        description: 'Start date for date range',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-12-31',
        description: 'End date for date range',
        required: false
    }),
    __metadata("design:type", String)
], SearchLoansDto.prototype, "endDate", void 0);
let LoansController = class LoansController {
    constructor(loansService, bikesService) {
        this.loansService = loansService;
        this.bikesService = bikesService;
    }
    async apply(data, req) {
        try {
            const user = req.user;
            return await this.loansService.applyForLoan(data, user);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Loan application failed');
        }
    }
    async findOne(id) {
        try {
            return await this.loansService.findOne(id);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to fetch loan details');
        }
    }
    async findAll(status, type, startDate, endDate) {
        try {
            return await this.loansService.findAll({ status, type, startDate, endDate });
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to fetch loans');
        }
    }
    async searchLoans(searchDto) {
        try {
            return await this.loansService.searchLoans(searchDto);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Search failed');
        }
    }
    async calculateCashLoan(data) {
        try {
            return await this.loansService.calculateCashLoan(data);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Cash loan calculation failed');
        }
    }
    async calculateBikeLoan(data) {
        try {
            return await this.loansService.calculateBikeLoan(data);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Bike loan calculation failed');
        }
    }
    async previewBikeLoan(salePrice, deposit, targetWeeks, targetMonthly) {
        try {
            return await this.loansService.previewBikeLoan({
                salePrice: Number(salePrice),
                deposit: Number(deposit),
                targetWeeks: targetWeeks ? Number(targetWeeks) : undefined,
                targetMonthly: targetMonthly ? Number(targetMonthly) : undefined,
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Bike loan preview failed');
        }
    }
    async createBikeLoan(bikeLoanDto) {
        try {
            const bike = await this.bikesService.findOne(bikeLoanDto.bike_id);
            if (!bike) {
                throw new common_1.BadRequestException('Bike not found');
            }
            const principal = bike.price - bikeLoanDto.deposit;
            if (principal <= 0) {
                throw new common_1.BadRequestException('Deposit cannot exceed or equal bike price');
            }
            return await this.loansService.create({
                ...bikeLoanDto,
                principal_amount: principal,
                loan_type: 'bike',
                status: 'pending_approval'
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Bike loan creation failed');
        }
    }
    async approveLoan(id, approvalDto, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can approve loans');
            }
            return await this.loansService.approveOrRejectLoan(id, approvalDto, user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Loan approval failed');
        }
    }
    async reverseLoan(id, reversalDto, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can perform loan reversals');
            }
            return await this.loansService.reverseOrAdjustLoan(id, reversalDto, user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Loan reversal failed. Please check permissions and try again.');
        }
    }
    async updateLoan(id, updateDto, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can update loans');
            }
            return await this.loansService.updateLoan(id, updateDto, user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Failed to update loan');
        }
    }
    async deleteLoan(id, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can delete loans');
            }
            return await this.loansService.softDeleteLoan(id, user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Failed to delete loan');
        }
    }
    async updateLoanStatus(id, status, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can update loan status');
            }
            return await this.loansService.updateLoanStatus(id, status, user);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Failed to update loan status');
        }
    }
    async getPortfolioSummary(req) {
        try {
            const user = req.user;
            return await this.loansService.getPortfolioSummary(user);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to generate portfolio summary');
        }
    }
    async getOverdueLoansReport() {
        try {
            return await this.loansService.getOverdueLoansReport();
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to generate overdue report');
        }
    }
    async getLoanAuditTrail(loanId, req) {
        try {
            const user = req.user;
            if (!user || user.role !== 'admin') {
                throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can view audit trails');
            }
            return await this.loansService.getLoanAuditTrail(loanId);
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(error.message || 'Failed to retrieve audit trail');
        }
    }
};
exports.LoansController = LoansController;
__decorate([
    (0, common_1.Post)('apply'),
    (0, swagger_1.ApiOperation)({
        summary: 'Apply for a loan',
        description: 'Submit a loan application. All loans require admin approval.'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Loan application submitted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ApplyLoanDto, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1 }),
    (0, swagger_1.ApiOperation)({ summary: 'Get loan details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan details retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Loan not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all loans with optional filters',
        description: 'Retrieve loans with optional filtering by status, type, date range, etc.'
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filter by status' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, description: 'Filter by loan type' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loans retrieved successfully' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search loans with advanced filters',
        description: 'Search loans by multiple criteria including loan number, client name, etc.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search results retrieved successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SearchLoansDto]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "searchLoans", null);
__decorate([
    (0, common_1.Post)('cash/calculate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Calculate cash loan EMI',
        description: 'Calculate monthly installments for cash loans with compound interest'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Calculation successful' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CashLoanCalculateDto]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "calculateCashLoan", null);
__decorate([
    (0, common_1.Post)('bike/calculate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Calculate bike loan terms',
        description: 'Calculate weekly flat-rate installment for bike loans'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Calculation successful' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bike_loan_calculate_dto_1.BikeLoanCalculateDto]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "calculateBikeLoan", null);
__decorate([
    (0, common_1.Get)('bike/preview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Preview bike loan options',
        description: 'Preview different bike loan scenarios'
    }),
    (0, swagger_1.ApiQuery)({ name: 'salePrice', required: true, type: Number, example: 15000000 }),
    (0, swagger_1.ApiQuery)({ name: 'deposit', required: true, type: Number, example: 3000000 }),
    (0, swagger_1.ApiQuery)({ name: 'targetWeeks', required: false, type: Number, example: 104 }),
    (0, swagger_1.ApiQuery)({ name: 'targetMonthly', required: false, type: Number, example: 500000 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Preview generated successfully' }),
    __param(0, (0, common_1.Query)('salePrice')),
    __param(1, (0, common_1.Query)('deposit')),
    __param(2, (0, common_1.Query)('targetWeeks')),
    __param(3, (0, common_1.Query)('targetMonthly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "previewBikeLoan", null);
__decorate([
    (0, common_1.Post)('create-bike-loan'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a bike-specific loan',
        description: 'Creates a bike loan with system-calculated principal based on bike price (Policy [2026-01-10])'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Bike loan created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid bike or deposit amount' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBikeLoanDto]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "createBikeLoan", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only: Approve or reject a loan',
        description: 'Only administrators can approve or reject loans per policy [2026-01-10]'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan approval processed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Loan not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, AdminApprovalDto, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "approveLoan", null);
__decorate([
    (0, common_1.Post)(':id/reverse'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only: Reverse or correct a loan transaction',
        description: 'Allows administrators to reverse late fees or adjust loan terms per policy [2026-01-10]'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan reversal processed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Loan not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, AdminReversalDto, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "reverseLoan", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only: Update loan details',
        description: 'Only administrators can update loan information per policy [2026-01-10]'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, UpdateLoanDto, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "updateLoan", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only: Delete a loan',
        description: 'Only administrators can delete loans (soft delete) per policy [2026-01-10]'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "deleteLoan", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin only: Update loan status',
        description: 'Only administrators can change loan status per policy [2026-01-10]'
    }),
    (0, swagger_1.ApiParam)({ name: 'id', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loan status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - Admin role required' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "updateLoanStatus", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get loan portfolio summary',
        description: 'Returns summary statistics for the loan portfolio'
    }),
    (0, common_1.SetMetadata)('roles', ['admin', 'manager']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Summary retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "getPortfolioSummary", null);
__decorate([
    (0, common_1.Get)('reports/overdue'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get overdue loans report',
        description: 'Returns list of overdue loans with details'
    }),
    (0, common_1.SetMetadata)('roles', ['admin', 'manager', 'agent']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Overdue report retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "getOverdueLoansReport", null);
__decorate([
    (0, common_1.Get)('reports/audit/:loanId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get audit trail for a loan',
        description: 'Returns audit log for a specific loan (Policy [2026-01-10])'
    }),
    (0, swagger_1.ApiParam)({ name: 'loanId', example: 1, description: 'Loan ID' }),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit trail retrieved successfully' }),
    __param(0, (0, common_1.Param)('loanId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], LoansController.prototype, "getLoanAuditTrail", null);
exports.LoansController = LoansController = __decorate([
    (0, swagger_1.ApiTags)('Loans'),
    (0, common_1.Controller)('loans'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [loans_service_1.LoansService,
        bikes_service_1.BikesService])
], LoansController);
//# sourceMappingURL=loans.controller.js.map
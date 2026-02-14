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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const payments_service_1 = require("./payments.service");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const reverse_payment_dto_1 = require("./dto/reverse-payment.dto");
let PaymentsController = class PaymentsController {
    constructor(paymentsService) {
        this.paymentsService = paymentsService;
    }
    create(createPaymentDto) {
        const serviceDto = {
            loanId: createPaymentDto.loan_id,
            amount: createPaymentDto.amount,
            paymentMethod: createPaymentDto.payment_method,
            receiptNumber: createPaymentDto.receipt_number,
            paymentDate: createPaymentDto.payment_date,
            transactionId: createPaymentDto.transaction_id,
            notes: createPaymentDto.notes,
            collectedBy: createPaymentDto.collected_by,
            scheduleId: createPaymentDto.schedule_id,
        };
        return this.paymentsService.create(serviceDto);
    }
    findAll() {
        return this.paymentsService.findAll();
    }
    findByLoanId(loanId) {
        return this.paymentsService.findByLoanId(+loanId);
    }
    findByReceiptNumber(receiptNumber) {
        return this.paymentsService.findByReceiptNumber(receiptNumber);
    }
    getTodayPayments() {
        return this.paymentsService.getTodayPayments();
    }
    getSummary() {
        return this.paymentsService.getSummary();
    }
    async findByDateRange(start, end) {
        return this.paymentsService.findByDateRange(new Date(start), new Date(end));
    }
    findOne(id) {
        return this.paymentsService.findOne(+id);
    }
    async reversePayment(id, reason, req) {
        const adminUser = req.user;
        return await this.paymentsService.reversePayment(id, adminUser, reason);
    }
    async legacyReversePayment(id, reverseDto, req) {
        const adminName = req.user?.username || req.user?.email || 'System Administrator';
        const userRole = req.user?.role;
        if (userRole !== 'admin') {
            throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can reverse payments');
        }
        return this.paymentsService.reversePayment(+id, req.user, reverseDto.reversal_reason);
    }
    remove(id) {
        throw new common_1.ForbiddenException('Payments should not be deleted. Use reversal instead for audit trail compliance. Policy [2026-01-10]');
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new payment' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payments' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('loan/:loanId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payments by loan ID' }),
    __param(0, (0, common_1.Param)('loanId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findByLoanId", null);
__decorate([
    (0, common_1.Get)('receipt/:receiptNumber'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment by receipt number' }),
    __param(0, (0, common_1.Param)('receiptNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findByReceiptNumber", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({ summary: 'Get today\'s payments' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getTodayPayments", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get daily payment summary' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('search/range'),
    (0, swagger_1.ApiOperation)({ summary: 'Find payments between two dates' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "findByDateRange", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/reverse'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.SetMetadata)('roles', ['admin']),
    (0, swagger_1.ApiOperation)({
        summary: 'Reverse a payment (Admin Only)',
        description: 'Policy [2026-01-10]: Only administrators can reverse transactions. This creates a complete audit trail and restores loan balance.'
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "reversePayment", null);
__decorate([
    (0, common_1.Patch)(':id/reverse'),
    (0, swagger_1.ApiOperation)({ summary: 'Reverse payment (Legacy endpoint)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reverse_payment_dto_1.ReversePaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "legacyReversePayment", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete payment (Not Allowed)',
        description: 'Payments should not be deleted. Use reversal instead for audit trail compliance.'
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "remove", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map
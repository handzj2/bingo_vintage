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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("./entities/payment.entity");
const payment_status_enum_1 = require("../enums/payment-status.enum");
const loan_entity_1 = require("../loans/entities/loan.entity");
const schedule_entity_1 = require("../loans/entities/schedule.entity");
const audit_service_1 = require("../audit/audit.service");
let PaymentsService = class PaymentsService {
    constructor(paymentRepo, scheduleRepo, loanRepo, auditService, connection) {
        this.paymentRepo = paymentRepo;
        this.scheduleRepo = scheduleRepo;
        this.loanRepo = loanRepo;
        this.auditService = auditService;
        this.connection = connection;
    }
    async create(createPaymentDto) {
        if (createPaymentDto.idempotencyKey) {
            const existing = await this.paymentRepo.findOne({
                where: { idempotencyKey: createPaymentDto.idempotencyKey }
            });
            if (existing) {
                return {
                    message: 'Payment already processed',
                    payment: existing,
                    receiptNumber: existing.receiptNumber,
                    duplicate: true
                };
            }
        }
        const loan = await this.loanRepo.findOne({
            where: { id: createPaymentDto.loanId }
        });
        if (!loan) {
            throw new common_1.NotFoundException(`Loan ${createPaymentDto.loanId} not found`);
        }
        const receiptNumber = createPaymentDto.receiptNumber ||
            `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const payment = this.paymentRepo.create({
            loan: loan,
            amount: createPaymentDto.amount,
            paymentMethod: createPaymentDto.paymentMethod,
            receiptNumber,
            status: payment_status_enum_1.PaymentStatus.COMPLETED,
            paymentDate: createPaymentDto.paymentDate || new Date(),
            transactionId: createPaymentDto.transactionId,
            notes: createPaymentDto.notes,
            collectedBy: createPaymentDto.collectedBy,
            idempotencyKey: createPaymentDto.idempotencyKey,
        });
        const savedPayment = await this.paymentRepo.save(payment);
        const newBalance = Math.max(0, Number(loan.balance) - Number(createPaymentDto.amount));
        await this.loanRepo.update(createPaymentDto.loanId, {
            balance: newBalance,
            status: newBalance === 0 ? loan_entity_1.LoanStatus.COMPLETED : loan.status
        });
        if (createPaymentDto.scheduleId) {
            await this.scheduleRepo.update(createPaymentDto.scheduleId, {
                status: schedule_entity_1.ScheduleStatus.PAID
            });
        }
        return {
            message: 'Payment recorded successfully',
            payment: savedPayment,
            receiptNumber,
            newBalance
        };
    }
    async reversePayment(paymentId, adminUser, reason) {
        if (adminUser.role !== 'admin') {
            throw new common_1.ForbiddenException('Policy [2026-01-10]: Admin access required');
        }
        if (!reason || reason.length < 10) {
            throw new common_1.BadRequestException('Reversal reason must be at least 10 characters');
        }
        const queryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const payment = await queryRunner.manager.findOne(payment_entity_1.Payment, {
                where: { id: paymentId },
                relations: ['loan'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!payment) {
                throw new common_1.NotFoundException(`Payment ${paymentId} not found`);
            }
            if (payment.status === payment_status_enum_1.PaymentStatus.REVERSED) {
                throw new common_1.ConflictException('Payment already reversed');
            }
            const loan = payment.loan;
            const restoredBalance = Number(loan.balance) + Number(payment.amount);
            await queryRunner.manager.update(loan_entity_1.Loan, loan.id, {
                balance: restoredBalance,
                status: loan_entity_1.LoanStatus.ACTIVE,
                updatedAt: new Date()
            });
            await queryRunner.manager.update(payment_entity_1.Payment, paymentId, {
                status: payment_status_enum_1.PaymentStatus.REVERSED,
                reversedAt: new Date(),
                reversedBy: adminUser.email || adminUser.username,
                reversalReason: reason,
                policyReference: '2026-01-10'
            });
            if (payment.scheduleId) {
                await queryRunner.manager.update(schedule_entity_1.LoanSchedule, payment.scheduleId, {
                    status: schedule_entity_1.ScheduleStatus.PENDING
                });
            }
            await this.auditService.logAction({
                action: 'PAYMENT_REVERSAL',
                tableName: 'payments',
                recordId: paymentId,
                user: adminUser.email || adminUser.username,
                description: `Policy [2026-01-10] enforced. Reason: ${reason}`,
                oldValues: {
                    paymentStatus: payment_status_enum_1.PaymentStatus.COMPLETED,
                    loanBalance: loan.balance,
                    loanStatus: loan.status
                },
                newValues: {
                    paymentStatus: payment_status_enum_1.PaymentStatus.REVERSED,
                    loanBalance: restoredBalance,
                    loanStatus: loan_entity_1.LoanStatus.ACTIVE
                },
                metadata: {
                    reversalAmount: payment.amount,
                    principalComponent: payment.principalAmount,
                    interestComponent: payment.interestAmount
                }
            });
            await queryRunner.commitTransaction();
            return {
                success: true,
                message: 'Payment reversed successfully per Policy [2026-01-10]',
                data: {
                    paymentId,
                    reversedAmount: payment.amount,
                    restoredBalance,
                    reversedBy: adminUser.email,
                    policyReference: '2026-01-10'
                }
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findAll() {
        return await this.paymentRepo.find({
            relations: ['loan', 'loan.client'],
            order: { paymentDate: 'DESC' },
        });
    }
    async findByLoanId(loanId) {
        return await this.paymentRepo.find({
            where: { loan: { id: loanId } },
            order: { paymentDate: 'DESC' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(schedule_entity_1.LoanSchedule)),
    __param(2, (0, typeorm_1.InjectRepository)(loan_entity_1.Loan)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        typeorm_2.Connection])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map
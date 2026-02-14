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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const typeorm_1 = require("typeorm");
const loan_entity_1 = require("../../loans/entities/loan.entity");
const payment_method_enum_1 = require("../../enums/payment-method.enum");
const payment_status_enum_1 = require("../../enums/payment-status.enum");
let Payment = class Payment {
    get amountPaid() {
        return this.amount;
    }
    set amountPaid(value) {
        this.amount = value;
    }
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => loan_entity_1.Loan, (loan) => loan.payments, { onDelete: 'CASCADE' }),
    __metadata("design:type", loan_entity_1.Loan)
], Payment.prototype, "loan", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_id' }),
    __metadata("design:type", Number)
], Payment.prototype, "loanId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2, default: 0, name: 'principal_amount' }),
    __metadata("design:type", Number)
], Payment.prototype, "principalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 12, scale: 2, default: 0, name: 'interest_amount' }),
    __metadata("design:type", Number)
], Payment.prototype, "interestAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: payment_method_enum_1.PaymentMethod, default: payment_method_enum_1.PaymentMethod.CASH }),
    __metadata("design:type", String)
], Payment.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Payment.prototype, "receiptNumber", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: payment_status_enum_1.PaymentStatus, default: payment_status_enum_1.PaymentStatus.COMPLETED }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Payment.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "collectedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'reversed_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "reversedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'reversal_reason' }),
    __metadata("design:type", String)
], Payment.prototype, "reversalReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'reversed_by' }),
    __metadata("design:type", String)
], Payment.prototype, "reversedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'policy_reference', default: '2026-01-10' }),
    __metadata("design:type", String)
], Payment.prototype, "policyReference", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments')
], Payment);
//# sourceMappingURL=payment.entity.js.map
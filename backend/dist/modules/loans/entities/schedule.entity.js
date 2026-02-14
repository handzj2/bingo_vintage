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
exports.LoanSchedule = exports.ScheduleStatus = void 0;
const typeorm_1 = require("typeorm");
const loan_entity_1 = require("./loan.entity");
var ScheduleStatus;
(function (ScheduleStatus) {
    ScheduleStatus["PENDING"] = "pending";
    ScheduleStatus["PAID"] = "paid";
    ScheduleStatus["OVERDUE"] = "overdue";
    ScheduleStatus["PARTIAL"] = "partial";
    ScheduleStatus["WAIVED"] = "waived";
    ScheduleStatus["DEFAULTED"] = "defaulted";
})(ScheduleStatus || (exports.ScheduleStatus = ScheduleStatus = {}));
let LoanSchedule = class LoanSchedule {
    get due_date() { return this.dueDate; }
    get remainingAmount() {
        return this.totalDue - this.paidAmount;
    }
    get isOverdue() {
        return new Date() > this.dueDate && this.status === ScheduleStatus.PENDING;
    }
    get isFullyPaid() {
        return this.paidAmount >= this.totalDue;
    }
};
exports.LoanSchedule = LoanSchedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_id' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "loanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'installment_number' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "installmentNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'due_date' }),
    __metadata("design:type", Date)
], LoanSchedule.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'principal_amount' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "principalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'interest_amount' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "interestAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'total_due' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "totalDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'paid_amount' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'penalty_amount' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "penaltyAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'late_fee_amount' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "lateFeeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'paid_date' }),
    __metadata("design:type", Date)
], LoanSchedule.prototype, "paidDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'payment_method' }),
    __metadata("design:type", String)
], LoanSchedule.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'receipt_number' }),
    __metadata("design:type", String)
], LoanSchedule.prototype, "receiptNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'payment_notes' }),
    __metadata("design:type", String)
], LoanSchedule.prototype, "paymentNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ScheduleStatus,
        default: ScheduleStatus.PENDING
    }),
    __metadata("design:type", String)
], LoanSchedule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'overdue_days' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "overdueDays", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => loan_entity_1.Loan, loan => loan.schedules, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'loan_id' }),
    __metadata("design:type", loan_entity_1.Loan)
], LoanSchedule.prototype, "loan", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], LoanSchedule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], LoanSchedule.prototype, "updatedAt", void 0);
exports.LoanSchedule = LoanSchedule = __decorate([
    (0, typeorm_1.Entity)('loan_schedules')
], LoanSchedule);
//# sourceMappingURL=schedule.entity.js.map
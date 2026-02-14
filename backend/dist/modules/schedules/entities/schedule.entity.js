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
const loan_entity_1 = require("../../loans/entities/loan.entity");
var ScheduleStatus;
(function (ScheduleStatus) {
    ScheduleStatus["PENDING"] = "PENDING";
    ScheduleStatus["PAID"] = "PAID";
    ScheduleStatus["PARTIAL"] = "PARTIAL";
    ScheduleStatus["OVERDUE"] = "OVERDUE";
    ScheduleStatus["CANCELLED"] = "CANCELLED";
})(ScheduleStatus || (exports.ScheduleStatus = ScheduleStatus = {}));
let LoanSchedule = class LoanSchedule {
    get loan_id() { return this.loanId; }
    set loan_id(value) { this.loanId = value; }
    get installment_number() { return this.installmentNumber; }
    set installment_number(value) { this.installmentNumber = value; }
    get due_date() { return this.dueDate; }
    set due_date(value) { this.dueDate = value; }
    get amount_due() { return this.amountDue; }
    set amount_due(value) { this.amountDue = value; }
    get principal_due() { return this.principalDue; }
    set principal_due(value) { this.principalDue = value; }
    get interest_due() { return this.interestDue; }
    set interest_due(value) { this.interestDue = value; }
    get amount_paid() { return this.amountPaid; }
    set amount_paid(value) { this.amountPaid = value; }
    get created_at() { return this.createdAt; }
    set created_at(value) { this.createdAt = value; }
    get updated_at() { return this.updatedAt; }
    set updated_at(value) { this.updatedAt = value; }
    get is_overdue() {
        return this.status === ScheduleStatus.OVERDUE ||
            (this.status === ScheduleStatus.PENDING && new Date(this.dueDate) < new Date());
    }
    get remaining_amount() {
        return Math.max(0, this.amountDue - this.amountPaid);
    }
    get is_fully_paid() {
        return this.amountPaid >= this.amountDue || this.status === ScheduleStatus.PAID;
    }
    get is_partial() {
        return this.status === ScheduleStatus.PARTIAL ||
            (this.amountPaid > 0 && this.amountPaid < this.amountDue);
    }
    recordPayment(amount) {
        this.amountPaid += amount;
        if (this.amountPaid >= this.amountDue) {
            this.status = ScheduleStatus.PAID;
        }
        else if (this.amountPaid > 0) {
            this.status = ScheduleStatus.PARTIAL;
        }
        this.updatedAt = new Date();
    }
    get is_pending() {
        return this.status === ScheduleStatus.PENDING;
    }
    get days_overdue() {
        if (!this.is_overdue)
            return 0;
        const today = new Date();
        const dueDate = new Date(this.dueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
};
exports.LoanSchedule = LoanSchedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => loan_entity_1.Loan, (loan) => loan.schedules, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'loan_id' }),
    __metadata("design:type", loan_entity_1.Loan)
], LoanSchedule.prototype, "loan", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_id' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "loanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'installment_number' }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "installmentNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'date' }),
    __metadata("design:type", Date)
], LoanSchedule.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_due', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "amountDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'principal_due', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "principalDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'interest_due', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "interestDue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_paid', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], LoanSchedule.prototype, "amountPaid", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ScheduleStatus,
        default: ScheduleStatus.PENDING
    }),
    __metadata("design:type", String)
], LoanSchedule.prototype, "status", void 0);
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
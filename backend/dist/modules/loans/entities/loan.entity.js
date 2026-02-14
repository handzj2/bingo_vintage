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
exports.Loan = exports.LoanStatus = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../../clients/entities/client.entity");
const bike_entity_1 = require("../../bikes/entities/bike.entity");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const schedule_entity_1 = require("./schedule.entity");
var LoanStatus;
(function (LoanStatus) {
    LoanStatus["PENDING"] = "PENDING";
    LoanStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    LoanStatus["ACTIVE"] = "ACTIVE";
    LoanStatus["DELINQUENT"] = "DELINQUENT";
    LoanStatus["COMPLETED"] = "COMPLETED";
    LoanStatus["DEFAULTED"] = "DEFAULTED";
    LoanStatus["CANCELLED"] = "CANCELLED";
})(LoanStatus || (exports.LoanStatus = LoanStatus = {}));
let Loan = class Loan {
    get loan_number() { return this.loanNumber; }
    set loan_number(value) { this.loanNumber = value; }
    get principal_amount() { return this.principalAmount; }
    set principal_amount(value) { this.principalAmount = value; }
    get total_amount() { return this.totalAmount; }
    set total_amount(value) { this.totalAmount = value; }
    get term_months() { return this.termMonths; }
    set term_months(value) { this.termMonths = value; }
    get start_date() { return this.startDate; }
    set start_date(value) { this.startDate = value; }
    get end_date() { return this.endDate; }
    set end_date(value) { this.endDate = value; }
    get created_at() { return this.createdAt; }
    get updated_at() { return this.updatedAt; }
    get approved_by() { return this.approvedBy; }
    set approved_by(value) { this.approvedBy = value; }
    get approved_at() { return this.approvedAt; }
    set approved_at(value) { this.approvedAt = value; }
    get created_by() { return this.createdBy; }
    set created_by(value) { this.createdBy = value; }
    get processing_fee() { return this.processingFee; }
    set processing_fee(value) { this.processingFee = value; }
    get deleted_at() { return this.deletedAt; }
    set deleted_at(value) { this.deletedAt = value; }
    get deleted_by() { return this.deletedBy; }
    set deleted_by(value) { this.deletedBy = value; }
    get isLocked() {
        return [LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.COMPLETED, LoanStatus.DEFAULTED].includes(this.status);
    }
    get requiresApproval() {
        return this.status === LoanStatus.PENDING_APPROVAL;
    }
    get canBeApproved() {
        return this.status === LoanStatus.PENDING_APPROVAL;
    }
    get isApproved() {
        return [LoanStatus.ACTIVE, LoanStatus.COMPLETED, LoanStatus.DELINQUENT].includes(this.status);
    }
    get isDelinquent() {
        return this.status === LoanStatus.DELINQUENT;
    }
    get isCompleted() {
        return this.status === LoanStatus.COMPLETED;
    }
    get isCancelled() {
        return this.status === LoanStatus.CANCELLED;
    }
    get remaining_months() {
        if (!this.startDate || !this.termMonths)
            return 0;
        const today = new Date();
        const start = new Date(this.startDate);
        const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12
            + (today.getMonth() - start.getMonth());
        return Math.max(0, this.termMonths - monthsDiff);
    }
    get is_disbursed() {
        return [LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.COMPLETED, LoanStatus.DEFAULTED].includes(this.status);
    }
    get disbursement_date() {
        return this.is_disbursed ? this.startDate : null;
    }
    get total_interest_paid() {
        if (!this.payments)
            return 0;
        return this.payments.reduce((sum, payment) => sum + (payment.interestAmount || 0), 0);
    }
    get total_principal_paid() {
        if (!this.payments)
            return 0;
        return this.payments.reduce((sum, payment) => sum + (payment.principalAmount || 0), 0);
    }
    get total_payments_made() {
        if (!this.payments)
            return 0;
        return this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }
    get monthly_payment() {
        if (!this.termMonths || this.termMonths === 0)
            return 0;
        return Number((this.totalAmount / this.termMonths).toFixed(2));
    }
    isOverdue() {
        if (![LoanStatus.ACTIVE, LoanStatus.DELINQUENT].includes(this.status))
            return false;
        const today = new Date();
        if (this.endDate && today > new Date(this.endDate))
            return true;
        if (this.schedules && this.schedules.length > 0) {
            return this.schedules.some(schedule => {
                return schedule.status === 'pending' && new Date(schedule.dueDate) < today;
            });
        }
        return false;
    }
    getOverdueAmount() {
        if (!this.schedules)
            return 0;
        const today = new Date();
        return this.schedules
            .filter(s => s.status === 'pending' && new Date(s.dueDate) < today)
            .reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
    }
    getDaysOverdue() {
        if (!this.schedules)
            return 0;
        const today = new Date();
        const overdueSchedules = this.schedules
            .filter(s => s.status === 'pending' && new Date(s.dueDate) < today);
        if (overdueSchedules.length === 0)
            return 0;
        const oldestOverdue = overdueSchedules.reduce((oldest, current) => {
            return new Date(current.dueDate) < new Date(oldest.dueDate) ? current : oldest;
        });
        const dueDate = new Date(oldestOverdue.dueDate);
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    get loan_to_value_ratio() {
        if (!this.bike || !this.bike.price)
            return null;
        return Number((this.principalAmount / this.bike.price).toFixed(2));
    }
    addAuditNote(action, performedBy, details) {
        const auditEntry = `
[${new Date().toISOString()}] - ${action}
Performed By: ${performedBy}
Details: ${details}
Policy Reference: [2026-01-10]
    `.trim();
        this.notes = this.notes
            ? `${this.notes}\n\n${auditEntry}`
            : auditEntry;
    }
    approve(adminId, comments) {
        if (this.status !== LoanStatus.PENDING_APPROVAL) {
            throw new Error('Only pending approval loans can be approved');
        }
        this.status = LoanStatus.ACTIVE;
        this.approvedBy = adminId;
        this.approvedAt = new Date();
        this.addAuditNote('LOAN_APPROVAL', `Admin ${adminId}`, `Loan approved${comments ? ` with comments: ${comments}` : ''}`);
    }
    reject(adminId, reason) {
        if (this.status !== LoanStatus.PENDING_APPROVAL) {
            throw new Error('Only pending approval loans can be rejected');
        }
        this.status = LoanStatus.CANCELLED;
        this.addAuditNote('LOAN_REJECTION', `Admin ${adminId}`, `Loan rejected${reason ? `: ${reason}` : ''}`);
    }
    softDelete(deletedBy) {
        this.deletedBy = deletedBy;
        this.deletedAt = new Date();
        this.status = LoanStatus.CANCELLED;
        this.addAuditNote('LOAN_DELETION', `Admin ${deletedBy}`, 'Loan soft deleted per Policy [2026-01-10]');
    }
    validate() {
        const errors = [];
        if (!this.loanNumber)
            errors.push('Loan number is required');
        if (!this.clientId)
            errors.push('Client ID is required');
        if (this.principalAmount <= 0)
            errors.push('Principal amount must be greater than 0');
        if (this.interestRate < 0)
            errors.push('Interest rate cannot be negative');
        if (this.termMonths <= 0)
            errors.push('Term months must be greater than 0');
        if (!this.startDate)
            errors.push('Start date is required');
        const expectedTotal = this.principalAmount * (1 + this.interestRate * this.termMonths / 12);
        if (Math.abs(this.totalAmount - expectedTotal) > 0.01) {
            errors.push(`Total amount calculation mismatch. Expected: ${expectedTotal.toFixed(2)}, Actual: ${this.totalAmount}`);
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
};
exports.Loan = Loan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Loan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_number', unique: true }),
    __metadata("design:type", String)
], Loan.prototype, "loanNumber", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Loan.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_id' }),
    __metadata("design:type", Number)
], Loan.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'principal_amount' }),
    __metadata("design:type", Number)
], Loan.prototype, "principalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, name: 'interest_rate' }),
    __metadata("design:type", Number)
], Loan.prototype, "interestRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount' }),
    __metadata("design:type", Number)
], Loan.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Loan.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'term_months' }),
    __metadata("design:type", Number)
], Loan.prototype, "termMonths", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'start_date' }),
    __metadata("design:type", Date)
], Loan.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', name: 'end_date', nullable: true }),
    __metadata("design:type", Date)
], Loan.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: LoanStatus,
        default: LoanStatus.PENDING_APPROVAL
    }),
    __metadata("design:type", String)
], Loan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bike_entity_1.Bike, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'bike_id' }),
    __metadata("design:type", bike_entity_1.Bike)
], Loan.prototype, "bike", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bike_id', nullable: true }),
    __metadata("design:type", Number)
], Loan.prototype, "bikeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Loan.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_entity_1.Payment, (payment) => payment.loan),
    __metadata("design:type", Array)
], Loan.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => schedule_entity_1.LoanSchedule, (schedule) => schedule.loan),
    __metadata("design:type", Array)
], Loan.prototype, "schedules", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Loan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Loan.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'approved_by' }),
    __metadata("design:type", Number)
], Loan.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'approved_at' }),
    __metadata("design:type", Date)
], Loan.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'created_by' }),
    __metadata("design:type", Number)
], Loan.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'processing_fee' }),
    __metadata("design:type", Number)
], Loan.prototype, "processingFee", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ nullable: true, name: 'deleted_at' }),
    __metadata("design:type", Date)
], Loan.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'deleted_by' }),
    __metadata("design:type", Number)
], Loan.prototype, "deletedBy", void 0);
exports.Loan = Loan = __decorate([
    (0, typeorm_1.Entity)('loans')
], Loan);
//# sourceMappingURL=loan.entity.js.map
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
exports.Client = void 0;
const typeorm_1 = require("typeorm");
const loan_entity_1 = require("../../loans/entities/loan.entity");
let Client = class Client {
    get name() {
        return `${this.firstName} ${this.lastName}`;
    }
};
exports.Client = Client;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Client.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name' }),
    __metadata("design:type", String)
], Client.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name' }),
    __metadata("design:type", String)
], Client.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Client.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_number', unique: true, nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "idNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nin', unique: true, nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "nin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "occupation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'employment_status', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "employmentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monthly_income', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Client.prototype, "monthlyIncome", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_name', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "bankName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_number', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "accountNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_branch', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "bankBranch", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_of_kin_name', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "nextOfKinName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_of_kin_phone', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "nextOfKinPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_of_kin_relationship', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "nextOfKinRelationship", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_name', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "businessName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_type', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "businessType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'business_address', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "businessAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sync_status', default: 'pending' }),
    __metadata("design:type", String)
], Client.prototype, "syncStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_of_birth', nullable: true }),
    __metadata("design:type", Date)
], Client.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'marital_status', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "maritalStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "nationality", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'postal_code', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_id', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "taxID", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'credit_score', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Client.prototype, "creditScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'loan_limit', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Client.prototype, "loanLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'account_balance', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Client.prototype, "accountBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Client.prototype, "verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_method', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "verificationMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => loan_entity_1.Loan, (loan) => loan.client),
    __metadata("design:type", Array)
], Client.prototype, "loans", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Client.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Client.prototype, "updatedAt", void 0);
exports.Client = Client = __decorate([
    (0, typeorm_1.Entity)('clients')
], Client);
//# sourceMappingURL=client.entity.js.map
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
exports.CreateLoanDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const loan_entity_1 = require("../entities/loan.entity");
class CreateLoanDto {
}
exports.CreateLoanDto = CreateLoanDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'LN-2024-001',
        description: 'Unique loan number'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "loan_number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Client UUID'
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['cash', 'bike'],
        example: 'bike',
        description: 'Type of loan'
    }),
    (0, class_validator_1.IsEnum)(['cash', 'bike']),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "loanType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Bike UUID (required for bike loans)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "bikeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 10000000,
        description: 'Principal loan amount'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "principal_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 0.1,
        description: 'Annual interest rate (decimal)'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "interest_rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 12000000,
        description: 'Total amount to be repaid (principal + interest)'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "total_amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 12,
        description: 'Loan term in months (for cash loans)'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "term_months", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: 104,
        description: 'Loan term in weeks (for bike loans)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "term_weeks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2024-01-01',
        description: 'Loan start date'
    }),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateLoanDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: '2025-01-01',
        description: 'Loan end date (calculated if not provided)'
    }),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CreateLoanDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: loan_entity_1.LoanStatus,
        example: 'active',
        description: 'Initial loan status',
        required: false,
        default: 'active'
    }),
    (0, class_validator_1.IsEnum)(loan_entity_1.LoanStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: 3000000,
        description: 'Deposit amount (for bike loans)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "deposit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: 500000,
        description: 'Weekly installment amount (for bike loans)'
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "weekly_installment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: 1,
        description: 'Legacy bike ID (integer reference - use bikeId for UUID)'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateLoanDto.prototype, "bike_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        required: false,
        example: 'Loan for Honda CBR150R purchase',
        description: 'Additional notes or comments'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLoanDto.prototype, "notes", void 0);
//# sourceMappingURL=create-loan.dto.js.map
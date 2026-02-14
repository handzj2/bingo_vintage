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
exports.BikeLoanCalculateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class BikeLoanCalculateDto {
}
exports.BikeLoanCalculateDto = BikeLoanCalculateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 9500000,
        description: 'Bike sale price (shown to client)'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BikeLoanCalculateDto.prototype, "salePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 500000,
        description: 'Initial deposit paid by client'
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BikeLoanCalculateDto.prototype, "deposit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 85000,
        description: 'Weekly payment amount',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], BikeLoanCalculateDto.prototype, "weeklyInstallment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 106,
        description: 'Target number of weeks to pay',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], BikeLoanCalculateDto.prototype, "targetWeeks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 6000000,
        description: 'Admin only: actual cost price',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BikeLoanCalculateDto.prototype, "costPrice", void 0);
//# sourceMappingURL=bike-loan-calculate.dto.js.map
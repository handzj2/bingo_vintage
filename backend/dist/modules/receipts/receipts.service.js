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
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../payments/entities/payment.entity");
const payment_status_enum_1 = require("../enums/payment-status.enum");
let ReceiptsService = class ReceiptsService {
    constructor(paymentRepo) {
        this.paymentRepo = paymentRepo;
    }
    async getReceiptData(receiptNumber) {
        const payment = await this.paymentRepo.findOne({
            where: { receiptNumber },
            relations: ['loan', 'loan.client'],
        });
        if (!payment)
            throw new common_1.NotFoundException('Receipt not found');
        if (payment.status === payment_status_enum_1.PaymentStatus.REVERSED) {
            throw new common_1.BadRequestException('This transaction was reversed and the receipt is void.');
        }
        return {
            receipt_no: payment.receiptNumber,
            date: payment.paymentDate,
            client_name: `${payment.loan.client.firstName} ${payment.loan.client.lastName}`,
            amount: payment.amountPaid,
            balance_remaining: payment.loan.balance,
            collected_by: payment.collectedBy,
            status: payment.status,
        };
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map
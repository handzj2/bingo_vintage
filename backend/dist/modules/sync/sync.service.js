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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const loan_entity_1 = require("../loans/entities/loan.entity");
const payment_entity_1 = require("../payments/entities/payment.entity");
const payment_status_enum_1 = require("../enums/payment-status.enum");
let SyncService = SyncService_1 = class SyncService {
    constructor(loanRepo, paymentRepo) {
        this.loanRepo = loanRepo;
        this.paymentRepo = paymentRepo;
        this.logger = new common_1.Logger(SyncService_1.name);
    }
    async reconcileBalances() {
        const loans = await this.loanRepo.find({ relations: ['payments'] });
        let fixedCount = 0;
        for (const loan of loans) {
            const actualPaid = loan.payments
                .filter(p => p.status === payment_status_enum_1.PaymentStatus.COMPLETED)
                .reduce((sum, p) => sum + Number(p.amountPaid), 0);
            const expectedBalance = Number(loan.total_amount) - actualPaid;
            if (Math.abs(Number(loan.balance) - expectedBalance) > 0.01) {
                await this.loanRepo.update(loan.id, { balance: expectedBalance });
                fixedCount++;
            }
        }
        return {
            message: 'Reconciliation complete',
            processed: loans.length,
            corrected: fixedCount
        };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(loan_entity_1.Loan)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SyncService);
//# sourceMappingURL=sync.service.js.map
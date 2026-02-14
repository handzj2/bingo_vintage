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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../payments/entities/payment.entity");
const loan_entity_1 = require("../loans/entities/loan.entity");
const schedule_entity_1 = require("../loans/entities/schedule.entity");
const date_fns_1 = require("date-fns");
let ReportsService = class ReportsService {
    constructor(paymentRepo, loanRepo, scheduleRepo) {
        this.paymentRepo = paymentRepo;
        this.loanRepo = loanRepo;
        this.scheduleRepo = scheduleRepo;
    }
    async getDailySummary(date = new Date()) {
        const start = (0, date_fns_1.startOfDay)(date);
        const end = (0, date_fns_1.endOfDay)(date);
        const payments = await this.paymentRepo.find({
            where: { paymentDate: (0, typeorm_2.Between)(start, end) }
        });
        const totalCollected = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const methodBreakdown = payments.reduce((acc, payment) => {
            const method = payment.paymentMethod;
            if (!acc[method])
                acc[method] = { count: 0, amount: 0 };
            acc[method].count += 1;
            acc[method].amount += Number(payment.amountPaid);
            return acc;
        }, {});
        const newLoansToday = await this.loanRepo.count({
            where: {
                createdAt: (0, typeorm_2.Between)(start, end),
                status: loan_entity_1.LoanStatus.ACTIVE
            }
        });
        return {
            date: start,
            total_collected: totalCollected,
            transaction_count: payments.length,
            method_breakdown: methodBreakdown,
            new_loans: newLoansToday
        };
    }
    async getArrearsReport(startDate, endDate) {
        const today = new Date();
        const queryStartDate = startDate || new Date(0);
        const queryEndDate = endDate || today;
        const loans = await this.loanRepo.find({
            where: {
                status: loan_entity_1.LoanStatus.ACTIVE,
                createdAt: (0, typeorm_2.Between)(queryStartDate, queryEndDate)
            },
            relations: ['client', 'schedules'],
        });
        const arrearsLoans = [];
        for (const loan of loans) {
            const overdueSchedules = (loan.schedules || []).filter(s => s.status === schedule_entity_1.ScheduleStatus.PENDING &&
                new Date(s.due_date) < today);
            const totalOverdue = overdueSchedules.reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
            const daysOverdue = overdueSchedules.length > 0
                ? Math.floor((today.getTime() - new Date(overdueSchedules[0].due_date).getTime()) / (1000 * 3600 * 24))
                : 0;
            if (daysOverdue > 0 && totalOverdue > 0) {
                arrearsLoans.push({
                    loan_id: loan.id,
                    loan_number: loan.loan_number,
                    client_name: `${loan.client.firstName} ${loan.client.lastName}`,
                    client_phone: loan.client.phone,
                    total_loan_amount: loan.principal_amount,
                    balance_remaining: loan.balance,
                    total_overdue_amount: totalOverdue,
                    days_overdue: daysOverdue,
                    last_due_date: overdueSchedules[0].due_date,
                    arrears_status: this.getArrearsStatus(daysOverdue),
                });
            }
        }
        arrearsLoans.sort((a, b) => b.days_overdue - a.days_overdue);
        return {
            report_date: today,
            total_loans_in_arrears: arrearsLoans.length,
            total_overdue_amount: arrearsLoans.reduce((sum, l) => sum + l.total_overdue_amount, 0),
            arrears_loans: arrearsLoans
        };
    }
    getArrearsStatus(daysOverdue) {
        if (daysOverdue > 30)
            return 'CRITICAL';
        if (daysOverdue > 7)
            return 'WARNING';
        return 'WATCH';
    }
    async getPaymentsByDateRange(startDate, endDate) {
        const payments = await this.paymentRepo.find({
            where: { paymentDate: (0, typeorm_2.Between)(startDate, endDate) },
            relations: ['loan', 'loan.client'],
        });
        return {
            total_amount: payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
            payments: payments.map(p => ({
                payment_id: p.id,
                amount: p.amountPaid,
                date: p.paymentDate,
                loan_number: p.loan?.loan_number,
                client_name: p.loan?.client ? `${p.loan.client.firstName} ${p.loan.client.lastName}` : 'N/A'
            }))
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(loan_entity_1.Loan)),
    __param(2, (0, typeorm_1.InjectRepository)(schedule_entity_1.LoanSchedule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map
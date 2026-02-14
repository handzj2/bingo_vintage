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
exports.LoansService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const loan_entity_1 = require("./entities/loan.entity");
const client_entity_1 = require("../clients/entities/client.entity");
const schedule_entity_1 = require("./entities/schedule.entity");
const bike_entity_1 = require("../bikes/entities/bike.entity");
const settings_service_1 = require("../settings/settings.service");
const date_fns_1 = require("date-fns");
const bikes_service_1 = require("../bikes/bikes.service");
let LoansService = class LoansService {
    constructor(loansRepo, clientsRepo, scheduleRepo, bikesRepo, settingsService, bikesService) {
        this.loansRepo = loansRepo;
        this.clientsRepo = clientsRepo;
        this.scheduleRepo = scheduleRepo;
        this.bikesRepo = bikesRepo;
        this.settingsService = settingsService;
        this.bikesService = bikesService;
    }
    calculateFlatInterest(principal, months, annualRate) {
        const totalInterest = principal * annualRate * months;
        const totalPayable = principal + totalInterest;
        const monthlyInstallment = totalPayable / months;
        return {
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalPayable: Math.round(totalPayable * 100) / 100,
            monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
        };
    }
    async applyForLoan(data, user) {
        return await this.loansRepo.manager.transaction(async (transactionalEntityManager) => {
            const { clientId, bikeId, amount, months = 12, interestRate } = data;
            console.log(`Loan application created by user: ${user?.id || 'unknown'} (${user?.email || 'no email'})`);
            const client = await transactionalEntityManager.findOne(client_entity_1.Client, { where: { id: clientId } });
            if (!client)
                throw new common_1.NotFoundException('Client not found');
            const annualRate = interestRate
                ? interestRate
                : await this.settingsService.getNumber('LOAN_INTEREST_RATE', 0.15);
            const processingFee = await this.settingsService.getNumber('loan.processing_fee', 0);
            const minLoanAmount = await this.settingsService.getNumber('loan.min_amount', 1000);
            const maxLoanAmount = await this.settingsService.getNumber('loan.max_amount', 50000);
            const defaultTerm = await this.settingsService.getNumber('loan.default_term_months', 12);
            const maxTerm = await this.settingsService.getNumber('loan.max_term_months', 36);
            if (amount < minLoanAmount) {
                throw new common_1.NotFoundException(`Loan amount must be at least ${minLoanAmount}`);
            }
            if (amount > maxLoanAmount) {
                throw new common_1.NotFoundException(`Loan amount cannot exceed ${maxLoanAmount}`);
            }
            const loanTerm = months || defaultTerm;
            if (loanTerm > maxTerm) {
                throw new common_1.NotFoundException(`Loan term cannot exceed ${maxTerm} months`);
            }
            const { totalPayable, monthlyInstallment, totalInterest } = this.calculateFlatInterest(amount, loanTerm, annualRate);
            const startDate = new Date();
            const endDate = (0, date_fns_1.addMonths)(startDate, loanTerm);
            if (bikeId) {
                const bike = await transactionalEntityManager.findOne(bike_entity_1.Bike, { where: { id: bikeId } });
                if (!bike)
                    throw new common_1.NotFoundException('Bike not found');
                if (bike.status !== bike_entity_1.BikeStatus.AVAILABLE) {
                    throw new common_1.BadRequestException(`Bike is not available for finance. Current status: ${bike.status}`);
                }
                await transactionalEntityManager.update(bike_entity_1.Bike, bike.id, {
                    status: bike_entity_1.BikeStatus.LOANED,
                    assigned_client_id: clientId
                });
            }
            const year = new Date().getFullYear();
            const count = await transactionalEntityManager.count(loan_entity_1.Loan);
            const loanNumber = `LN-${year}-${(count + 1).toString().padStart(4, '0')}`;
            const loanData = {
                loanNumber: loanNumber,
                principalAmount: amount,
                interestRate: annualRate,
                processingFee: processingFee,
                totalAmount: totalPayable + processingFee,
                balance: totalPayable + processingFee,
                termMonths: loanTerm,
                startDate: startDate,
                endDate: endDate,
                client: client,
                status: loan_entity_1.LoanStatus.PENDING_APPROVAL,
                createdBy: user?.id || null,
                ...(bikeId && { bike: { id: bikeId } }),
            };
            const loan = transactionalEntityManager.create(loan_entity_1.Loan, loanData);
            const savedLoan = await transactionalEntityManager.save(loan_entity_1.Loan, loan);
            return savedLoan;
        });
    }
    async generateMonthlySchedule(loan, principal, months, rate, processingFee, monthlyInstallment, totalInterest) {
        const recalcTotalInterest = principal * rate * months;
        const recalcTotalPayable = Number(principal) + Number(recalcTotalInterest);
        const recalcMonthlyInstallment = recalcTotalPayable / months;
        loan.totalAmount = recalcTotalPayable + processingFee;
        loan.balance = recalcTotalPayable + processingFee;
        await this.loansRepo.save(loan);
        const scheduleEntries = [];
        for (let i = 1; i <= months; i++) {
            const principalAmount = principal / months;
            const interestAmount = totalInterest / months;
            const scheduleEntry = this.scheduleRepo.create({
                loan: loan,
                loanId: loan.id,
                installmentNumber: i,
                dueDate: (0, date_fns_1.addMonths)(loan.startDate, i),
                principalAmount: Math.round(principalAmount * 100) / 100,
                interestAmount: Math.round(interestAmount * 100) / 100,
                totalDue: Math.round(monthlyInstallment * 100) / 100,
                status: schedule_entity_1.ScheduleStatus.PENDING
            });
            scheduleEntries.push(scheduleEntry);
        }
        await this.scheduleRepo.save(scheduleEntries);
    }
    async findOne(id) {
        const loan = await this.loansRepo.findOne({
            where: { id },
            relations: ['client', 'schedules', 'bike']
        });
        if (!loan)
            throw new common_1.NotFoundException(`Loan with ID ${id} not found`);
        return loan;
    }
    async getLoanSummary(amount, months) {
        const annualRate = await this.settingsService.getNumber('LOAN_INTEREST_RATE', 0.15);
        const processingFee = await this.settingsService.getNumber('loan.processing_fee', 0);
        const defaultTerm = await this.settingsService.getNumber('loan.default_term_months', 12);
        const loanTerm = months || defaultTerm;
        const { totalPayable, monthlyInstallment, totalInterest } = this.calculateFlatInterest(amount, loanTerm, annualRate);
        return {
            principal: amount,
            interest_rate: annualRate,
            processing_fee: processingFee,
            term_months: loanTerm,
            monthly_payment: monthlyInstallment,
            total_amount: totalPayable + processingFee,
            total_interest: totalInterest,
            settings_applied: {
                interest_rate: annualRate,
                processing_fee: processingFee,
                term: loanTerm
            }
        };
    }
    async calculateCashLoan(data) {
        const { amount, termMonths, interestRate, startDate } = data;
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be > 0');
        if (termMonths <= 0)
            throw new common_1.BadRequestException('Term must be > 0');
        if (interestRate < 0)
            throw new common_1.BadRequestException('Interest cannot be negative');
        const { totalPayable, monthlyInstallment, totalInterest } = this.calculateFlatInterest(amount, termMonths, interestRate);
        const schedule = [];
        const start = startDate ? new Date(startDate) : new Date();
        const monthlyPrincipal = amount / termMonths;
        const monthlyInterest = totalInterest / termMonths;
        let remainingBalance = amount;
        for (let month = 1; month <= termMonths; month++) {
            remainingBalance = Math.max(0, remainingBalance - monthlyPrincipal);
            const dueDate = new Date(start);
            dueDate.setMonth(start.getMonth() + month);
            schedule.push({
                month,
                dueDate: dueDate.toISOString().split('T')[0],
                principal: Math.round(monthlyPrincipal * 100) / 100,
                interest: Math.round(monthlyInterest * 100) / 100,
                total: Math.round(monthlyInstallment * 100) / 100,
                remaining: Math.round(remainingBalance * 100) / 100,
            });
        }
        return {
            success: true,
            data: {
                loanAmount: amount,
                termMonths,
                interestRate,
                monthlyPayment: monthlyInstallment,
                totalPayable: totalPayable,
                totalInterest: totalInterest,
                schedule,
                policy: {
                    model: 'Flat Interest Rate',
                    reference: '[2026-01-10]',
                    description: 'Once a staff member enters the amount and months, the installments are locked and cannot be edited.',
                    calculation: {
                        formula: 'totalInterest = principal * interestRate * months',
                        example: `For ${amount} at ${interestRate * 100}% for ${termMonths} months`,
                        totalInterest: totalInterest,
                        monthlyBreakdown: `${Math.round(monthlyPrincipal * 100) / 100} principal + ${Math.round(monthlyInterest * 100) / 100} interest`
                    }
                }
            },
        };
    }
    async calculateBikeLoan(data) {
        try {
            if (data.deposit >= data.salePrice) {
                throw new common_1.BadRequestException('Deposit must be less than sale price');
            }
            let weeklyInstallment = data.weeklyInstallment;
            if (data.targetWeeks && !weeklyInstallment) {
                const balance = data.salePrice - data.deposit;
                weeklyInstallment = Math.ceil(balance / data.targetWeeks);
            }
            if (!weeklyInstallment) {
                const balance = data.salePrice - data.deposit;
                weeklyInstallment = Math.ceil(balance / 52);
            }
            if (weeklyInstallment <= 0) {
                throw new common_1.BadRequestException('Weekly installment must be greater than 0');
            }
            const balance = data.salePrice - data.deposit;
            const weeksRaw = balance / weeklyInstallment;
            const weeksToPay = Math.ceil(weeksRaw);
            const totalPayable = data.deposit + (weeklyInstallment * weeksToPay);
            const schedule = [];
            let remainingBalance = balance;
            const startDate = new Date();
            for (let week = 1; week <= weeksToPay; week++) {
                const dueDate = (0, date_fns_1.addWeeks)(startDate, week);
                remainingBalance = Math.max(0, remainingBalance - weeklyInstallment);
                schedule.push({
                    weekNumber: week,
                    dueDate: dueDate.toISOString().split('T')[0],
                    amount: weeklyInstallment,
                    remainingBalance: Math.round(remainingBalance),
                });
            }
            let adminData = null;
            if (data.costPrice && data.costPrice > 0) {
                const totalProfit = data.salePrice - data.costPrice;
                const adminOutlay = data.costPrice - data.deposit;
                const weeklyRate = (data.salePrice / adminOutlay - 1) / weeksToPay;
                const annualRate = weeklyRate * 52 * 100;
                adminData = {
                    totalProfit: Math.round(totalProfit),
                    profitPercentage: Math.round((totalProfit / data.costPrice) * 100),
                    impliedWeeklyRate: Math.round(weeklyRate * 100),
                    impliedAnnualRate: Math.round(annualRate),
                    adminOutlay: Math.round(adminOutlay),
                };
            }
            return {
                success: true,
                data: {
                    salePrice: data.salePrice,
                    deposit: data.deposit,
                    weeklyInstallment,
                    weeksToPay,
                    totalPayable,
                    estimatedMonths: Math.ceil(weeksToPay / 4.33),
                    paymentSchedule: schedule,
                    adminData,
                },
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Failed to calculate bike loan');
        }
    }
    async previewBikeLoan(data) {
        let weeklyInstallment = 0;
        let weeksToPay = 0;
        if (data.targetWeeks) {
            const balance = data.salePrice - data.deposit;
            weeklyInstallment = Math.ceil(balance / data.targetWeeks);
            weeksToPay = data.targetWeeks;
        }
        else if (data.targetMonthly) {
            weeklyInstallment = Math.ceil(data.targetMonthly / 4.33);
            const balance = data.salePrice - data.deposit;
            weeksToPay = Math.ceil(balance / weeklyInstallment);
        }
        else {
            const balance = data.salePrice - data.deposit;
            weeklyInstallment = Math.ceil(balance / 52);
            weeksToPay = Math.ceil(balance / weeklyInstallment);
        }
        return await this.calculateBikeLoan({
            salePrice: data.salePrice,
            deposit: data.deposit,
            weeklyInstallment,
        });
    }
    async create(createLoanDto) {
        return await this.loansRepo.manager.transaction(async (transactionalEntityManager) => {
            const { client_id, bike_id, deposit, term_weeks, interest_rate, term_months } = createLoanDto;
            const bike = await transactionalEntityManager.findOne(bike_entity_1.Bike, { where: { id: bike_id } });
            if (!bike) {
                throw new common_1.NotFoundException(`Bike with ID ${bike_id} not found`);
            }
            if (bike.status !== bike_entity_1.BikeStatus.AVAILABLE) {
                throw new common_1.BadRequestException(`Bike is not available for finance. Current status: ${bike.status}`);
            }
            const client = await transactionalEntityManager.findOne(client_entity_1.Client, { where: { id: client_id } });
            if (!client) {
                throw new common_1.NotFoundException(`Client with ID ${client_id} not found`);
            }
            const principalAmount = Number(bike.sale_price) - deposit;
            if (principalAmount <= 0) {
                throw new common_1.BadRequestException('Deposit cannot exceed or equal bike price');
            }
            const weeklyInstallment = Math.ceil(principalAmount / term_weeks);
            await transactionalEntityManager.update(bike_entity_1.Bike, bike.id, {
                status: bike_entity_1.BikeStatus.LOANED,
                assigned_client_id: client_id
            });
            const year = new Date().getFullYear();
            const count = await transactionalEntityManager.count(loan_entity_1.Loan);
            const loanNumber = `LN-B-${year}-${(count + 1).toString().padStart(4, '0')}`;
            const loan = transactionalEntityManager.create(loan_entity_1.Loan, {
                loanNumber: loanNumber,
                principalAmount: principalAmount,
                interestRate: interest_rate || 0,
                totalAmount: principalAmount,
                termMonths: term_months || Math.ceil(term_weeks / 4.33),
                startDate: new Date(),
                status: loan_entity_1.LoanStatus.PENDING_APPROVAL,
                client: client,
                bike: bike,
                notes: `Bike Loan Entry: ${bike.model}`,
                balance: principalAmount,
            });
            const savedLoan = await transactionalEntityManager.save(loan_entity_1.Loan, loan);
            return {
                success: true,
                data: {
                    loan: savedLoan,
                    summary: {
                        bikePrice: bike.price,
                        deposit,
                        principalAmount,
                        weeklyInstallment,
                        totalWeeks: term_weeks,
                        totalPayable: principalAmount,
                    }
                }
            };
        });
    }
    async remove(id, user) {
        if (user.role !== 'admin') {
            throw new common_1.ForbiddenException('Transaction Finality: Only an administrator can reverse or delete this record.');
        }
        const loan = await this.loansRepo.findOne({ where: { id } });
        if (!loan) {
            throw new common_1.NotFoundException(`Loan with ID ${id} not found`);
        }
        await this.loansRepo.softDelete(id);
        if (loan.bike && loan.bike.id) {
            await this.bikesRepo.update(loan.bike.id, { status: bike_entity_1.BikeStatus.AVAILABLE });
        }
        return {
            success: true,
            message: `Loan ${id} has been soft deleted by admin ${user.id}`,
            deletedAt: new Date(),
        };
    }
    async updateLoan(id, updateLoanDto, user) {
        const loan = await this.loansRepo.findOne({ where: { id } });
        if (!loan)
            throw new common_1.NotFoundException('Loan not found');
        const isAdmin = user.roles && user.roles.includes('admin');
        if (loan.status === loan_entity_1.LoanStatus.ACTIVE && !isAdmin) {
            const financialFields = ['principal_amount', 'interest_rate', 'term_months', 'term_weeks', 'weekly_installment'];
            const attemptingToChangeFinance = Object.keys(updateLoanDto).some(key => financialFields.includes(key));
            if (attemptingToChangeFinance) {
                throw new common_1.ForbiddenException('Modifying financial terms of an active loan requires admin role');
            }
        }
        const updatedLoan = await this.loansRepo.save({ ...loan, ...updateLoanDto });
        return updatedLoan;
    }
    async reverseOrAdjustLoan(id, data, user) {
        if (user.role !== 'admin') {
            throw new common_1.ForbiddenException("Governance Error: Only admins can perform reversals.");
        }
        const loan = await this.loansRepo.findOne({ where: { id } });
        if (!loan) {
            throw new common_1.NotFoundException(`Loan with ID ${id} not found`);
        }
        const auditEntry = `
[ADMIN REVERSAL - ${new Date().toISOString()}]
Action: BALANCE_ADJUSTMENT
Performed By: Admin ${user.id} (${user.name || user.email})
Reason: ${data.reason}
Policy Reference: [2026-01-10]
Previous Balance: ${loan.balance}
New Balance: ${data.newBalance}
Difference: ${loan.balance - data.newBalance}
    `.trim();
        loan.balance = data.newBalance;
        loan.notes = loan.notes
            ? `${loan.notes}\n\n${auditEntry}`
            : auditEntry;
        if (loan.status === loan_entity_1.LoanStatus.DELINQUENT && data.newBalance <= loan.principalAmount) {
            loan.status = loan_entity_1.LoanStatus.ACTIVE;
        }
        const updatedLoan = await this.loansRepo.save(loan);
        return {
            success: true,
            message: "Loan reversal completed successfully",
            data: {
                loanId: id,
                previousBalance: loan.balance,
                newBalance: data.newBalance,
                status: updatedLoan.status,
                adminId: user.id,
                timestamp: new Date(),
                auditNote: auditEntry
            }
        };
    }
    async reverseOrAdjustLoanDetailed(loanId, adjustmentData, adminUser) {
        if (adminUser.role !== 'admin') {
            throw new common_1.UnauthorizedException("Policy [2026-01-10]: Only admins can perform reversals.");
        }
        const loan = await this.loansRepo.findOne({ where: { id: loanId } });
        if (!loan) {
            throw new common_1.NotFoundException(`Loan with ID ${loanId} not found`);
        }
        const previousBalance = loan.balance;
        const newBalance = adjustmentData.newBalance;
        const difference = previousBalance - newBalance;
        console.log(`[LOAN AUDIT] - Admin Adjustment`);
        console.log(`Loan ID: ${loanId}`);
        console.log(`Admin User: ${adminUser.id} (${adminUser.email})`);
        console.log(`Previous Balance: ${previousBalance}`);
        console.log(`New Balance: ${newBalance}`);
        console.log(`Difference: ${difference}`);
        console.log(`Justification: ${adjustmentData.reason}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`--- End Audit Log ---`);
        const auditEntry = `
[ADMIN ADJUSTMENT - ${new Date().toISOString()}]
Action: BALANCE_REVERSAL
Performed By: Admin ${adminUser.id} (${adminUser.email})
Previous Balance: ${previousBalance}
New Balance: ${newBalance}
Difference: ${difference}
Justification: ${adjustmentData.reason}
Policy Reference: [2026-01-10] - Transaction correction requires admin role
    `.trim();
        loan.balance = newBalance;
        loan.notes = loan.notes
            ? `${loan.notes}\n\n${auditEntry}`
            : auditEntry;
        const updatedLoan = await this.loansRepo.save(loan);
        return {
            success: true,
            message: "Loan adjustment completed with audit trail",
            data: {
                loanId,
                previousBalance,
                newBalance,
                difference,
                adjustmentType: difference > 0 ? 'CREDIT' : 'DEBIT',
                adminUserId: adminUser.id,
                timestamp: new Date(),
                auditEntry
            }
        };
    }
    async findAll(filters) {
        const query = this.loansRepo.createQueryBuilder('loan')
            .leftJoinAndSelect('loan.client', 'client')
            .leftJoinAndSelect('loan.bike', 'bike');
        if (filters.status) {
            query.andWhere('loan.status = :status', { status: filters.status });
        }
        if (filters.type) {
            if (filters.type === 'bike') {
                query.andWhere('loan.bike IS NOT NULL');
            }
            else if (filters.type === 'cash') {
                query.andWhere('loan.bike IS NULL');
            }
        }
        if (filters.startDate) {
            query.andWhere('loan.startDate >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            query.andWhere('loan.endDate <= :endDate', { endDate: filters.endDate });
        }
        query.orderBy('loan.createdAt', 'DESC');
        return await query.getMany();
    }
    async searchLoans(searchDto) {
        const query = this.loansRepo.createQueryBuilder('loan')
            .leftJoinAndSelect('loan.client', 'client')
            .leftJoinAndSelect('loan.bike', 'bike');
        if (searchDto.loanNumber) {
            query.andWhere('loan.loanNumber LIKE :loanNumber', { loanNumber: `%${searchDto.loanNumber}%` });
        }
        if (searchDto.clientName) {
            query.andWhere('client.name LIKE :clientName', { clientName: `%${searchDto.clientName}%` });
        }
        if (searchDto.status) {
            query.andWhere('loan.status = :status', { status: searchDto.status });
        }
        if (searchDto.loanType) {
            if (searchDto.loanType === 'bike') {
                query.andWhere('loan.bike IS NOT NULL');
            }
            else if (searchDto.loanType === 'cash') {
                query.andWhere('loan.bike IS NULL');
            }
        }
        if (searchDto.startDate) {
            query.andWhere('loan.startDate >= :startDate', { startDate: searchDto.startDate });
        }
        if (searchDto.endDate) {
            query.andWhere('loan.endDate <= :endDate', { endDate: searchDto.endDate });
        }
        query.orderBy('loan.createdAt', 'DESC');
        return await query.getMany();
    }
    async approveOrRejectLoan(id, dto, admin) {
        if (admin.role !== 'admin') {
            throw new common_1.ForbiddenException('Policy [2026-01-10]: Only administrators can approve loans');
        }
        const loan = await this.findOne(id);
        const auditNote = `
[LOAN APPROVAL - ${new Date().toISOString()}]
Action: ${dto.status === 'approved' ? 'APPROVED' : 'REJECTED'}
Performed By: Admin ${admin.id} (${admin.email || admin.name})
Comments: ${dto.comments || 'No comments provided'}
Policy Reference: ${dto.policyReference || '[2026-01-10]'}
Previous Status: ${loan.status}
New Status: ${dto.status === 'approved' ? 'ACTIVE' : 'CANCELLED'}
    `.trim();
        loan.status = dto.status === 'approved' ? loan_entity_1.LoanStatus.ACTIVE : loan_entity_1.LoanStatus.CANCELLED;
        loan.notes = loan.notes ? `${loan.notes}\n\n${auditNote}` : auditNote;
        loan.approvedBy = admin.id;
        loan.approvedAt = new Date();
        if (dto.status === 'approved' && loan.status === loan_entity_1.LoanStatus.ACTIVE) {
            await this.generateMonthlySchedule(loan, loan.principalAmount, loan.termMonths, loan.interestRate, loan.processingFee || 0, loan.totalAmount / loan.termMonths, loan.totalAmount - loan.principalAmount);
        }
        const updatedLoan = await this.loansRepo.save(loan);
        return {
            success: true,
            message: `Loan ${dto.status === 'approved' ? 'approved' : 'rejected'} successfully`,
            data: updatedLoan,
            audit: auditNote
        };
    }
    async updateLoanStatus(id, status, user) {
        if (user.role !== 'admin') {
            throw new common_1.ForbiddenException('Only administrators can update loan status');
        }
        const loan = await this.findOne(id);
        loan.status = status;
        return await this.loansRepo.save(loan);
    }
    async softDeleteLoan(id, user) {
        if (user.role !== 'admin') {
            throw new common_1.ForbiddenException('Only administrators can delete loans');
        }
        const loan = await this.loansRepo.findOne({ where: { id } });
        if (!loan) {
            throw new common_1.NotFoundException('Loan not found');
        }
        loan.status = loan_entity_1.LoanStatus.CANCELLED;
        loan.deletedAt = new Date();
        loan.deletedBy = user.id;
        if (loan.bike && loan.bike.id) {
            await this.bikesRepo.update(loan.bike.id, {
                status: bike_entity_1.BikeStatus.AVAILABLE,
                assigned_client_id: null
            });
        }
        return await this.loansRepo.save(loan);
    }
    async getPortfolioSummary(user) {
        const totalLoans = await this.loansRepo.count();
        const activeLoans = await this.loansRepo.count({ where: { status: loan_entity_1.LoanStatus.ACTIVE } });
        const pendingLoans = await this.loansRepo.count({ where: { status: loan_entity_1.LoanStatus.PENDING_APPROVAL } });
        const overdueLoans = await this.loansRepo.count({ where: { status: loan_entity_1.LoanStatus.DELINQUENT } });
        const totalAmount = await this.loansRepo
            .createQueryBuilder('loan')
            .select('SUM(loan.principalAmount)', 'total')
            .getRawOne();
        return {
            totalLoans,
            activeLoans,
            pendingLoans,
            overdueLoans,
            totalPortfolioValue: totalAmount?.total || 0,
            generatedAt: new Date(),
            generatedBy: user?.email || 'unknown'
        };
    }
    async getOverdueLoansReport() {
        const overdueLoans = await this.loansRepo.find({
            where: {
                status: loan_entity_1.LoanStatus.DELINQUENT
            },
            relations: ['client', 'bike']
        });
        return overdueLoans.map(loan => ({
            id: loan.id,
            loanNumber: loan.loanNumber,
            clientName: loan.client?.name || 'Unknown',
            amount: loan.principalAmount,
            balance: loan.balance,
            daysOverdue: this.calculateDaysOverdue(loan.endDate),
            status: loan.status
        }));
    }
    async getLoanAuditTrail(loanId) {
        const loan = await this.findOne(loanId);
        const auditEntries = [];
        if (loan.notes) {
            const lines = loan.notes.split('\n');
            let currentEntry = '';
            for (const line of lines) {
                if (line.startsWith('[')) {
                    if (currentEntry) {
                        auditEntries.push(this.parseAuditEntry(currentEntry));
                    }
                    currentEntry = line;
                }
                else if (currentEntry) {
                    currentEntry += '\n' + line;
                }
            }
            if (currentEntry) {
                auditEntries.push(this.parseAuditEntry(currentEntry));
            }
        }
        return {
            loanId,
            loanNumber: loan.loanNumber,
            auditTrail: auditEntries
        };
    }
    calculateDaysOverdue(endDate) {
        const today = new Date();
        const dueDate = new Date(endDate);
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    parseAuditEntry(entry) {
        const lines = entry.split('\n');
        const result = {};
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                if (key.includes('[') && key.includes(']')) {
                    result.timestamp = key.trim();
                }
                else if (key.trim()) {
                    result[key.trim()] = value;
                }
            }
        }
        return result;
    }
};
exports.LoansService = LoansService;
exports.LoansService = LoansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(loan_entity_1.Loan)),
    __param(1, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(2, (0, typeorm_1.InjectRepository)(schedule_entity_1.LoanSchedule)),
    __param(3, (0, typeorm_1.InjectRepository)(bike_entity_1.Bike)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        settings_service_1.SettingsService,
        bikes_service_1.BikesService])
], LoansService);
//# sourceMappingURL=loans.service.js.map
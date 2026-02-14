import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Client } from '../clients/entities/client.entity';
import { LoanSchedule, ScheduleStatus } from './entities/schedule.entity';
import { Bike, BikeStatus } from '../bikes/entities/bike.entity';
import { SettingsService } from '../settings/settings.service';
import { addMonths, addWeeks } from 'date-fns';
import { ApplyLoanDto } from './loans.controller';
import { BikeLoanCalculateDto } from './dto/bike-loan-calculate.dto';
import { CashLoanCalculateDto } from './loans.controller';
import { BikesService } from '../bikes/bikes.service';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan) private loansRepo: Repository<Loan>,
    @InjectRepository(Client) private clientsRepo: Repository<Client>,
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(Bike) private bikesRepo: Repository<Bike>,
    private settingsService: SettingsService,
    private bikesService: BikesService,
  ) {}

  // ==================== EXISTING METHODS ====================

  // ✅ FLAT INTEREST HELPER METHOD
  private calculateFlatInterest(principal: number, months: number, annualRate: number) {
    const totalInterest = principal * annualRate * months;
    const totalPayable = principal + totalInterest;
    const monthlyInstallment = totalPayable / months;

    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
    };
  }

  // ✅ UPDATED: applyForLoan signature to include user parameter
  async applyForLoan(data: ApplyLoanDto, user: any): Promise<Loan> {
    return await this.loansRepo.manager.transaction(async (transactionalEntityManager) => {
      const { clientId, bikeId, amount, months = 12, interestRate } = data;
      
      // Log the user who created the application
      console.log(`Loan application created by user: ${user?.id || 'unknown'} (${user?.email || 'no email'})`);
      
      // 1. Validate client exists
      const client = await transactionalEntityManager.findOne(Client, { where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found');

      // ✅ DYNAMIC INTEREST RATE FROM SETTINGS
      const annualRate = interestRate 
        ? interestRate 
        : await this.settingsService.getNumber('LOAN_INTEREST_RATE', 0.15);

      // ✅ GET OTHER LOAN SETTINGS
      const processingFee = await this.settingsService.getNumber('loan.processing_fee', 0);
      const minLoanAmount = await this.settingsService.getNumber('loan.min_amount', 1000);
      const maxLoanAmount = await this.settingsService.getNumber('loan.max_amount', 50000);
      const defaultTerm = await this.settingsService.getNumber('loan.default_term_months', 12);
      const maxTerm = await this.settingsService.getNumber('loan.max_term_months', 36);

      // Validate loan amount against settings
      if (amount < minLoanAmount) {
        throw new NotFoundException(`Loan amount must be at least ${minLoanAmount}`);
      }
      
      if (amount > maxLoanAmount) {
        throw new NotFoundException(`Loan amount cannot exceed ${maxLoanAmount}`);
      }

      // Validate loan term against settings
      const loanTerm = months || defaultTerm;
      if (loanTerm > maxTerm) {
        throw new NotFoundException(`Loan term cannot exceed ${maxTerm} months`);
      }

      // ✅ FLAT INTEREST CALCULATION FOR CASH LOAN WITH EXACT MATH
      const { totalPayable, monthlyInstallment, totalInterest } = this.calculateFlatInterest(amount, loanTerm, annualRate);

      const startDate = new Date();
      const endDate = addMonths(startDate, loanTerm);

      // 2. Lock the Bike in the Bike Tab if bike loan
      if (bikeId) {
        const bike = await transactionalEntityManager.findOne(Bike, { where: { id: bikeId } });
        if (!bike) throw new NotFoundException('Bike not found');
        
        if (bike.status !== BikeStatus.AVAILABLE) {
          throw new BadRequestException(`Bike is not available for finance. Current status: ${bike.status}`);
        }
        
        // Automate the status change within transaction
        await transactionalEntityManager.update(
          Bike, 
          bike.id, 
          { 
            status: BikeStatus.LOANED,
            assigned_client_id: clientId 
          }
        );
      }

      // ✅ Generate Loan Number if missing
      const year = new Date().getFullYear();
      const count = await transactionalEntityManager.count(Loan);
      const loanNumber = `LN-${year}-${(count + 1).toString().padStart(4, '0')}`;

      // 3. Save Loan with Initial Balance
      const loanData = {
        loanNumber: loanNumber,
        principalAmount: amount,
        interestRate: annualRate,
        processingFee: processingFee,
        // ✅ LOCKED TOTAL AMOUNT (Flat Interest Model) with exact math
        totalAmount: totalPayable + processingFee,
        balance: totalPayable + processingFee,
        termMonths: loanTerm,
        startDate: startDate,
        endDate: endDate,
        client: client,
        status: LoanStatus.PENDING_APPROVAL, // All loans require admin approval
        createdBy: user?.id || null, // Log who created the loan
        ...(bikeId && { bike: { id: bikeId } }),
      };

      const loan = transactionalEntityManager.create(Loan, loanData);
      const savedLoan = await transactionalEntityManager.save(Loan, loan);

      // 4. Generate the Payment Schedule automatically (but only for approved loans)
      // For pending approval, schedule will be generated upon approval

      return savedLoan;
    });
  }

  // ✅ EXISTING generateMonthlySchedule method (kept for backward compatibility)
  private async generateMonthlySchedule(
    loan: Loan, 
    principal: number, 
    months: number, 
    rate: number, 
    processingFee: number, 
    monthlyInstallment: number, 
    totalInterest: number
  ) {
    const recalcTotalInterest = principal * rate * months;
    const recalcTotalPayable = Number(principal) + Number(recalcTotalInterest);
    const recalcMonthlyInstallment = recalcTotalPayable / months;

    // ✅ Save these values to the Loan record for the Admin Audit [cite: 2026-01-10]
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
        dueDate: addMonths(loan.startDate, i),
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalDue: Math.round(monthlyInstallment * 100) / 100,
        status: ScheduleStatus.PENDING
      });
      
      scheduleEntries.push(scheduleEntry);
    }
    
    await this.scheduleRepo.save(scheduleEntries);
  }

  async findOne(id: number) {
    const loan = await this.loansRepo.findOne({ 
      where: { id }, 
      relations: ['client', 'schedules', 'bike']
    });
    if (!loan) throw new NotFoundException(`Loan with ID ${id} not found`);
    return loan;
  }

  async getLoanSummary(amount: number, months?: number) {
    const annualRate = await this.settingsService.getNumber('LOAN_INTEREST_RATE', 0.15);
    const processingFee = await this.settingsService.getNumber('loan.processing_fee', 0);
    const defaultTerm = await this.settingsService.getNumber('loan.default_term_months', 12);
    
    const loanTerm = months || defaultTerm;
    
    // ✅ FLAT INTEREST CALCULATION WITH EXACT MATH
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

  // ✅ UPDATED: Cash loan calculation with Flat Interest Rate and exact math
  async calculateCashLoan(data: CashLoanCalculateDto) {
    const { amount, termMonths, interestRate, startDate } = data;
    
    // Validation
    if (amount <= 0) throw new BadRequestException('Amount must be > 0');
    if (termMonths <= 0) throw new BadRequestException('Term must be > 0');
    if (interestRate < 0) throw new BadRequestException('Interest cannot be negative');

    // ✅ FLAT INTEREST CALCULATION WITH EXACT MATH
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

  async calculateBikeLoan(data: BikeLoanCalculateDto) {
    try {
      if (data.deposit >= data.salePrice) {
        throw new BadRequestException('Deposit must be less than sale price');
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
        throw new BadRequestException('Weekly installment must be greater than 0');
      }

      const balance = data.salePrice - data.deposit;
      const weeksRaw = balance / weeklyInstallment;
      const weeksToPay = Math.ceil(weeksRaw);
      const totalPayable = data.deposit + (weeklyInstallment * weeksToPay);

      const schedule = [];
      let remainingBalance = balance;
      const startDate = new Date();

      for (let week = 1; week <= weeksToPay; week++) {
        const dueDate = addWeeks(startDate, week);
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
      
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to calculate bike loan');
    }
  }

  async previewBikeLoan(data: {
    salePrice: number;
    deposit: number;
    targetWeeks?: number;
    targetMonthly?: number;
  }) {
    let weeklyInstallment = 0;
    let weeksToPay = 0;

    if (data.targetWeeks) {
      const balance = data.salePrice - data.deposit;
      weeklyInstallment = Math.ceil(balance / data.targetWeeks);
      weeksToPay = data.targetWeeks;
    } else if (data.targetMonthly) {
      weeklyInstallment = Math.ceil(data.targetMonthly / 4.33);
      const balance = data.salePrice - data.deposit;
      weeksToPay = Math.ceil(balance / weeklyInstallment);
    } else {
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

  // ✅ TRANSACTION-BASED BIKE LOAN CREATION
  async create(createLoanDto: any) {
    return await this.loansRepo.manager.transaction(async (transactionalEntityManager) => {
      const { client_id, bike_id, deposit, term_weeks, interest_rate, term_months } = createLoanDto;
      
      // 1. Get the bike and client within transaction
      const bike = await transactionalEntityManager.findOne(Bike, { where: { id: bike_id } });
      if (!bike) {
        throw new NotFoundException(`Bike with ID ${bike_id} not found`);
      }
      
      if (bike.status !== BikeStatus.AVAILABLE) {
        throw new BadRequestException(`Bike is not available for finance. Current status: ${bike.status}`);
      }
      
      const client = await transactionalEntityManager.findOne(Client, { where: { id: client_id } });
      if (!client) {
        throw new NotFoundException(`Client with ID ${client_id} not found`);
      }
      
      // 2. Calculate principal
      const principalAmount = Number(bike.sale_price) - deposit;
      if (principalAmount <= 0) {
        throw new BadRequestException('Deposit cannot exceed or equal bike price');
      }
      
      // 3. Calculate weekly installment
      const weeklyInstallment = Math.ceil(principalAmount / term_weeks);
      
      // 4. Lock the Bike in the Bike Tab
      await transactionalEntityManager.update(
        Bike, 
        bike.id, 
        { 
          status: BikeStatus.LOANED,
          assigned_client_id: client_id 
        }
      );

      // 5. Generate Loan Number
      const year = new Date().getFullYear();
      const count = await transactionalEntityManager.count(Loan);
      const loanNumber = `LN-B-${year}-${(count + 1).toString().padStart(4, '0')}`;

      // 6. Save Loan with Initial Balance
      const loan = transactionalEntityManager.create(Loan, {
        loanNumber: loanNumber,
        principalAmount: principalAmount,
        interestRate: interest_rate || 0,
        totalAmount: principalAmount,
        termMonths: term_months || Math.ceil(term_weeks / 4.33),
        startDate: new Date(),
        status: LoanStatus.PENDING_APPROVAL, // Changed to require admin approval
        client: client,
        bike: bike,
        notes: `Bike Loan Entry: ${bike.model}`,
        balance: principalAmount,
      });
      
      const savedLoan = await transactionalEntityManager.save(Loan, loan);
      
      // Schedule will be generated upon approval
      
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

  async remove(id: number, user: User) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Transaction Finality: Only an administrator can reverse or delete this record.'
      );
    }
    
    const loan = await this.loansRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
    }
    
    await this.loansRepo.softDelete(id);
    
    if (loan.bike && loan.bike.id) {
      await this.bikesRepo.update(loan.bike.id, { status: BikeStatus.AVAILABLE });
    }
    
    return {
      success: true,
      message: `Loan ${id} has been soft deleted by admin ${user.id}`,
      deletedAt: new Date(),
    };
  }

  async updateLoan(id: number, updateLoanDto: any, user: any) {
    const loan = await this.loansRepo.findOne({ where: { id } });
    
    if (!loan) throw new NotFoundException('Loan not found');

    const isAdmin = user.roles && user.roles.includes('admin');
    
    if (loan.status === LoanStatus.ACTIVE && !isAdmin) {
      const financialFields = ['principal_amount', 'interest_rate', 'term_months', 'term_weeks', 'weekly_installment'];
      const attemptingToChangeFinance = Object.keys(updateLoanDto).some(key => 
        financialFields.includes(key)
      );

      if (attemptingToChangeFinance) {
        throw new ForbiddenException('Modifying financial terms of an active loan requires admin role');
      }
    }

    const updatedLoan = await this.loansRepo.save({ ...loan, ...updateLoanDto });
    
    return updatedLoan;
  }

  async reverseOrAdjustLoan(id: number, data: any, user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException("Governance Error: Only admins can perform reversals.");
    }
    
    const loan = await this.loansRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${id} not found`);
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

    if (loan.status === LoanStatus.DELINQUENT && data.newBalance <= loan.principalAmount) {
      loan.status = LoanStatus.ACTIVE;
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

  async reverseOrAdjustLoanDetailed(loanId: number, adjustmentData: any, adminUser: any) {
    if (adminUser.role !== 'admin') {
      throw new UnauthorizedException("Policy [2026-01-10]: Only admins can perform reversals.");
    }

    const loan = await this.loansRepo.findOne({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
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

  // ==================== NEW METHODS FOR CONTROLLER ====================

  // 1. Find all loans with filters
  async findAll(filters: { status?: string; type?: string; startDate?: string; endDate?: string }) {
    const query = this.loansRepo.createQueryBuilder('loan')
      .leftJoinAndSelect('loan.client', 'client')
      .leftJoinAndSelect('loan.bike', 'bike');

    if (filters.status) {
      query.andWhere('loan.status = :status', { status: filters.status });
    }
    
    if (filters.type) {
      if (filters.type === 'bike') {
        query.andWhere('loan.bike IS NOT NULL');
      } else if (filters.type === 'cash') {
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

  // 2. Search Loans (The Search Bar logic)
  async searchLoans(searchDto: any) {
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
      } else if (searchDto.loanType === 'cash') {
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

  // 3. Governance: Approve/Reject (Policy [2026-01-10])
  async approveOrRejectLoan(id: number, dto: any, admin: any) {
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Policy [2026-01-10]: Only administrators can approve loans');
    }
    
    const loan = await this.findOne(id);
    
    // Audit trail
    const auditNote = `
[LOAN APPROVAL - ${new Date().toISOString()}]
Action: ${dto.status === 'approved' ? 'APPROVED' : 'REJECTED'}
Performed By: Admin ${admin.id} (${admin.email || admin.name})
Comments: ${dto.comments || 'No comments provided'}
Policy Reference: ${dto.policyReference || '[2026-01-10]'}
Previous Status: ${loan.status}
New Status: ${dto.status === 'approved' ? 'ACTIVE' : 'CANCELLED'}
    `.trim();
    
    // Update loan status
    loan.status = dto.status === 'approved' ? LoanStatus.ACTIVE : LoanStatus.CANCELLED;
    loan.notes = loan.notes ? `${loan.notes}\n\n${auditNote}` : auditNote;
    loan.approvedBy = admin.id;
    loan.approvedAt = new Date();
    
    // If approved and no schedule exists, generate payment schedule
    if (dto.status === 'approved' && loan.status === LoanStatus.ACTIVE) {
      await this.generateMonthlySchedule(
        loan,
        loan.principalAmount,
        loan.termMonths,
        loan.interestRate,
        loan.processingFee || 0,
        loan.totalAmount / loan.termMonths,
        loan.totalAmount - loan.principalAmount
      );
    }
    
    const updatedLoan = await this.loansRepo.save(loan);
    
    return {
      success: true,
      message: `Loan ${dto.status === 'approved' ? 'approved' : 'rejected'} successfully`,
      data: updatedLoan,
      audit: auditNote
    };
  }

  // 4. Placeholders for remaining reports to clear errors
  async updateLoanStatus(id: number, status: string, user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can update loan status');
    }
    
    const loan = await this.findOne(id);
    loan.status = status as LoanStatus;
    
    return await this.loansRepo.save(loan);
  }

  async softDeleteLoan(id: number, user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can delete loans');
    }
    
    const loan = await this.loansRepo.findOne({ where: { id } });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    
    loan.status = LoanStatus.CANCELLED;
    loan.deletedAt = new Date();
    loan.deletedBy = user.id;
    
    // If it's a bike loan, release the bike
    if (loan.bike && loan.bike.id) {
      await this.bikesRepo.update(loan.bike.id, { 
        status: BikeStatus.AVAILABLE,
        assigned_client_id: null 
      });
    }
    
    return await this.loansRepo.save(loan);
  }

  async getPortfolioSummary(user: any) {
    // Basic summary - can be expanded with more detailed analytics
    const totalLoans = await this.loansRepo.count();
    const activeLoans = await this.loansRepo.count({ where: { status: LoanStatus.ACTIVE } });
    const pendingLoans = await this.loansRepo.count({ where: { status: LoanStatus.PENDING_APPROVAL } });
    const overdueLoans = await this.loansRepo.count({ where: { status: LoanStatus.DELINQUENT } });
    
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
        status: LoanStatus.DELINQUENT 
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

  async getLoanAuditTrail(loanId: number) {
    const loan = await this.findOne(loanId);
    
    // Parse audit trail from notes (simplified implementation)
    // In a real system, you'd have a separate AuditLog entity
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
        } else if (currentEntry) {
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

  // ==================== HELPER METHODS ====================

  private calculateDaysOverdue(endDate: Date): number {
    const today = new Date();
    const dueDate = new Date(endDate);
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private parseAuditEntry(entry: string): any {
    const lines = entry.split('\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (key.includes('[') && key.includes(']')) {
          result.timestamp = key.trim();
        } else if (key.trim()) {
          result[key.trim()] = value;
        }
      }
    }
    
    return result;
  }
}
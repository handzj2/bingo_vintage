import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  ParseIntPipe,
  Query,
  BadRequestException,
  Request,
  UseGuards,
  SetMetadata,
  ForbiddenException,
  Put,
  Delete,
  Patch
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiProperty, 
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { BikeLoanCalculateDto } from './dto/bike-loan-calculate.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../auth/guards/roles.guard';
import { BikesService } from '../bikes/bikes.service';

// ==================== DTO DEFINITIONS ====================

export class AdminApprovalDto {
  @ApiProperty({ 
    example: 'approved', 
    description: 'Approval status',
    enum: ['approved', 'rejected', 'pending_approval']
  })
  status: string;
  
  @ApiProperty({ 
    example: 'Loan meets all requirements', 
    description: 'Approval comments',
    required: false
  })
  comments?: string;
  
  @ApiProperty({ 
    example: '2026-01-10', 
    description: 'Policy reference for audit trail'
  })
  policyReference: string;
}

export class CreateBikeLoanDto {
  @ApiProperty({ example: 1, description: 'Client ID' })
  client_id: number;
  
  @ApiProperty({ example: 1, description: 'Bike ID' })
  bike_id: number;
  
  @ApiProperty({ example: 3000000, description: 'Deposit amount' })
  deposit: number;
  
  @ApiProperty({ example: 104, description: 'Loan term in weeks' })
  term_weeks: number;
  
  @ApiProperty({ example: 0.1, description: 'Interest rate (if applicable)', required: false })
  interest_rate?: number;
  
  @ApiProperty({ example: '2026-01-10', description: 'Policy reference' })
  policyReference?: string;
}

export class ApplyLoanDto {
  @ApiProperty({ example: 1 })
  clientId: number;
  
  @ApiProperty({ example: 1 })
  bikeId: number;
  
  @ApiProperty({ example: 5000000 })
  amount: number;
  
  @ApiProperty({ example: 12 })
  months: number;
  
  @ApiProperty({ example: 0.15, required: false })
  interestRate?: number;
}

export class CashLoanCalculateDto {
  @ApiProperty({ example: 5000000, description: 'Loan amount' })
  amount: number;
  
  @ApiProperty({ example: 12, description: 'Loan term in months' })
  termMonths: number;
  
  @ApiProperty({ example: 0.15, description: 'Annual interest rate' })
  interestRate: number;
  
  @ApiProperty({ 
    example: '2024-01-01', 
    description: 'Loan start date (optional)', 
    required: false 
  })
  startDate?: string;
}

export class AdminReversalDto {
  @ApiProperty({ 
    example: 'Customer made advance payment, waiving late fee', 
    description: 'Reason for the reversal' 
  })
  reason: string;
  
  @ApiProperty({ 
    example: 5000000, 
    description: 'New balance after reversal' 
  })
  newBalance: number;
  
  @ApiProperty({ 
    example: 'late_fee_reversal', 
    description: 'Type of reversal',
    enum: ['late_fee_reversal', 'interest_adjustment', 'term_extension', 'principal_reduction', 'other']
  })
  reversalType: string;
  
  @ApiProperty({ 
    example: 5000, 
    description: 'Amount to be reversed/adjusted' 
  })
  amount: number;
  
  @ApiProperty({ 
    example: '2026-01-10', 
    description: 'Policy reference for the reversal' 
  })
  policyReference: string;
  
  @ApiProperty({ 
    example: { old_status: 'delinquent', new_status: 'active' }, 
    description: 'Detailed changes being made',
    required: false
  })
  changes?: Record<string, any>;
}

export class UpdateLoanDto {
  @ApiProperty({ 
    example: 'updated loan details', 
    description: 'Updated loan information',
    required: false
  })
  details?: string;
  
  @ApiProperty({ 
    example: 5500000, 
    description: 'Updated loan amount',
    required: false
  })
  amount?: number;
  
  @ApiProperty({ 
    example: '2026-01-10', 
    description: 'Policy reference for update'
  })
  policyReference: string;
}

export class SearchLoansDto {
  @ApiProperty({ 
    example: 'LN-2024-001', 
    description: 'Search by loan number',
    required: false
  })
  loanNumber?: string;
  
  @ApiProperty({ 
    example: 'John', 
    description: 'Search by client name',
    required: false
  })
  clientName?: string;
  
  @ApiProperty({ 
    example: 'active', 
    description: 'Filter by status',
    required: false
  })
  status?: string;
  
  @ApiProperty({ 
    example: 'cash', 
    description: 'Filter by loan type',
    required: false
  })
  loanType?: string;
  
  @ApiProperty({ 
    example: '2024-01-01', 
    description: 'Start date for date range',
    required: false
  })
  startDate?: string;
  
  @ApiProperty({ 
    example: '2024-12-31', 
    description: 'End date for date range',
    required: false
  })
  endDate?: string;
}

// ==================== MAIN CONTROLLER ====================

@ApiTags('Loans')
@Controller('loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly bikesService: BikesService
  ) {}

  // ==================== PUBLIC ENDPOINTS (AUTHENTICATED) ====================

  @Post('apply')
  @ApiOperation({ 
    summary: 'Apply for a loan',
    description: 'Submit a loan application. All loans require admin approval.' 
  })
  @ApiResponse({ status: 201, description: 'Loan application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async apply(@Body() data: ApplyLoanDto, @Request() req) {
    try {
      const user = req.user;
      return await this.loansService.applyForLoan(data, user);
    } catch (error) {
      throw new BadRequestException(error.message || 'Loan application failed');
    }
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({ summary: 'Get loan details' })
  @ApiResponse({ status: 200, description: 'Loan details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      return await this.loansService.findOne(id);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch loan details');
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all loans with optional filters',
    description: 'Retrieve loans with optional filtering by status, type, date range, etc.' 
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by loan type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Loans retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      return await this.loansService.findAll({ status, type, startDate, endDate });
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to fetch loans');
    }
  }

  @Post('search')
  @ApiOperation({ 
    summary: 'Search loans with advanced filters',
    description: 'Search loans by multiple criteria including loan number, client name, etc.' 
  })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchLoans(@Body() searchDto: SearchLoansDto) {
    try {
      return await this.loansService.searchLoans(searchDto);
    } catch (error) {
      throw new BadRequestException(error.message || 'Search failed');
    }
  }

  // ==================== CALCULATION ENDPOINTS ====================

  @Post('cash/calculate')
  @ApiOperation({ 
    summary: 'Calculate cash loan EMI',
    description: 'Calculate monthly installments for cash loans with compound interest' 
  })
  @ApiResponse({ status: 200, description: 'Calculation successful' })
  async calculateCashLoan(@Body() data: CashLoanCalculateDto) {
    try {
      return await this.loansService.calculateCashLoan(data);
    } catch (error) {
      throw new BadRequestException(error.message || 'Cash loan calculation failed');
    }
  }

  @Post('bike/calculate')
  @ApiOperation({ 
    summary: 'Calculate bike loan terms',
    description: 'Calculate weekly flat-rate installment for bike loans' 
  })
  @ApiResponse({ status: 200, description: 'Calculation successful' })
  async calculateBikeLoan(@Body() data: BikeLoanCalculateDto) {
    try {
      return await this.loansService.calculateBikeLoan(data);
    } catch (error) {
      throw new BadRequestException(error.message || 'Bike loan calculation failed');
    }
  }

  @Get('bike/preview')
  @ApiOperation({ 
    summary: 'Preview bike loan options',
    description: 'Preview different bike loan scenarios' 
  })
  @ApiQuery({ name: 'salePrice', required: true, type: Number, example: 15000000 })
  @ApiQuery({ name: 'deposit', required: true, type: Number, example: 3000000 })
  @ApiQuery({ name: 'targetWeeks', required: false, type: Number, example: 104 })
  @ApiQuery({ name: 'targetMonthly', required: false, type: Number, example: 500000 })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async previewBikeLoan(
    @Query('salePrice') salePrice: string,
    @Query('deposit') deposit: string,
    @Query('targetWeeks') targetWeeks?: string,
    @Query('targetMonthly') targetMonthly?: string,
  ) {
    try {
      return await this.loansService.previewBikeLoan({
        salePrice: Number(salePrice),
        deposit: Number(deposit),
        targetWeeks: targetWeeks ? Number(targetWeeks) : undefined,
        targetMonthly: targetMonthly ? Number(targetMonthly) : undefined,
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Bike loan preview failed');
    }
  }

  // ==================== SPECIALIZED LOAN CREATION ====================

  @Post('create-bike-loan')
  @ApiOperation({ 
    summary: 'Create a bike-specific loan',
    description: 'Creates a bike loan with system-calculated principal based on bike price (Policy [2026-01-10])' 
  })
  @ApiResponse({ status: 201, description: 'Bike loan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bike or deposit amount' })
  async createBikeLoan(@Body() bikeLoanDto: CreateBikeLoanDto) {
    try {
      // 1. Validation: Ensure the bike exists and get its official price
      const bike = await this.bikesService.findOne(bikeLoanDto.bike_id);
      
      if (!bike) {
        throw new BadRequestException('Bike not found');
      }
      
      // 2. Logic: The system (not the user) sets the base price
      // This honors the policy that core data can't be edited by users [cite: 2026-01-10]
      const principal = bike.price - bikeLoanDto.deposit;
      
      if (principal <= 0) {
        throw new BadRequestException('Deposit cannot exceed or equal bike price');
      }
      
      // 3. Pass to Service to generate the Weekly Schedule
      return await this.loansService.create({
        ...bikeLoanDto,
        principal_amount: principal,
        loan_type: 'bike',
        status: 'pending_approval' // All loans start as pending approval
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Bike loan creation failed');
    }
  }

  // ==================== ADMIN-ONLY ENDPOINTS ====================

  @Post(':id/approve')
  @ApiOperation({ 
    summary: 'Admin only: Approve or reject a loan',
    description: 'Only administrators can approve or reject loans per policy [2026-01-10]' 
  })
  @ApiParam({ name: 'id', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Loan approval processed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async approveLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() approvalDto: AdminApprovalDto,
    @Request() req
  ) {
    try {
      const user = req.user;
      
      // Extra layer of security: verify admin role even though RolesGuard handles it
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can approve loans');
      }
      
      return await this.loansService.approveOrRejectLoan(id, approvalDto, user);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Loan approval failed');
    }
  }

  @Post(':id/reverse')
  @ApiOperation({ 
    summary: 'Admin only: Reverse or correct a loan transaction',
    description: 'Allows administrators to reverse late fees or adjust loan terms per policy [2026-01-10]' 
  })
  @ApiParam({ name: 'id', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Loan reversal processed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async reverseLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() reversalDto: AdminReversalDto,
    @Request() req
  ) {
    try {
      // The RolesGuard will block non-admins before this point
      // This manual check serves as an extra security layer and audit reference
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can perform loan reversals');
      }
      
      // Process the reversal with admin user context for audit trail
      return await this.loansService.reverseOrAdjustLoan(id, reversalDto, user);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Loan reversal failed. Please check permissions and try again.'
      );
    }
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Admin only: Update loan details',
    description: 'Only administrators can update loan information per policy [2026-01-10]' 
  })
  @ApiParam({ name: 'id', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Loan updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLoanDto,
    @Request() req
  ) {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can update loans');
      }
      
      return await this.loansService.updateLoan(id, updateDto, user);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update loan');
    }
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Admin only: Delete a loan',
    description: 'Only administrators can delete loans (soft delete) per policy [2026-01-10]' 
  })
  @ApiParam({ name: 'id', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Loan deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async deleteLoan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req
  ) {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can delete loans');
      }
      
      return await this.loansService.softDeleteLoan(id, user);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to delete loan');
    }
  }

  @Patch(':id/status')
  @ApiOperation({ 
    summary: 'Admin only: Update loan status',
    description: 'Only administrators can change loan status per policy [2026-01-10]' 
  })
  @ApiParam({ name: 'id', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin'])
  @ApiResponse({ status: 200, description: 'Loan status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateLoanStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Request() req
  ) {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can update loan status');
      }
      
      return await this.loansService.updateLoanStatus(id, status, user);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to update loan status');
    }
  }

  // ==================== REPORTS & ANALYTICS ====================

  @Get('reports/summary')
  @ApiOperation({ 
    summary: 'Get loan portfolio summary',
    description: 'Returns summary statistics for the loan portfolio' 
  })
  @SetMetadata('roles', ['admin', 'manager']) // Allow managers and admins
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getPortfolioSummary(@Request() req) {
    try {
      const user = req.user;
      return await this.loansService.getPortfolioSummary(user);
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to generate portfolio summary');
    }
  }

  @Get('reports/overdue')
  @ApiOperation({ 
    summary: 'Get overdue loans report',
    description: 'Returns list of overdue loans with details' 
  })
  @SetMetadata('roles', ['admin', 'manager', 'agent']) // All roles can see overdue
  @ApiResponse({ status: 200, description: 'Overdue report retrieved successfully' })
  async getOverdueLoansReport() {
    try {
      return await this.loansService.getOverdueLoansReport();
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to generate overdue report');
    }
  }

  @Get('reports/audit/:loanId')
  @ApiOperation({ 
    summary: 'Get audit trail for a loan',
    description: 'Returns audit log for a specific loan (Policy [2026-01-10])' 
  })
  @ApiParam({ name: 'loanId', example: 1, description: 'Loan ID' })
  @SetMetadata('roles', ['admin']) // Only admins can see full audit trail
  @ApiResponse({ status: 200, description: 'Audit trail retrieved successfully' })
  async getLoanAuditTrail(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Request() req
  ) {
    try {
      const user = req.user;
      
      if (!user || user.role !== 'admin') {
        throw new ForbiddenException('Policy [2026-01-10]: Only administrators can view audit trails');
      }
      
      return await this.loansService.getLoanAuditTrail(loanId);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to retrieve audit trail');
    }
  }
}
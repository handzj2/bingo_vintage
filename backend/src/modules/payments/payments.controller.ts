import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  ForbiddenException,
  Query,
  SetMetadata
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // 👈 Import RolesGuard
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    const serviceDto = {
      loanId: createPaymentDto.loan_id,
      amount: createPaymentDto.amount,
      paymentMethod: createPaymentDto.payment_method,
      receiptNumber: createPaymentDto.receipt_number,
      paymentDate: createPaymentDto.payment_date,
      transactionId: createPaymentDto.transaction_id,
      notes: createPaymentDto.notes,
      collectedBy: createPaymentDto.collected_by,
      scheduleId: createPaymentDto.schedule_id,
    };
    return this.paymentsService.create(serviceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get payments by loan ID' })
  findByLoanId(@Param('loanId') loanId: string) {
    return this.paymentsService.findByLoanId(+loanId);
  }

  @Get('receipt/:receiptNumber')
  @ApiOperation({ summary: 'Get payment by receipt number' })
  findByReceiptNumber(@Param('receiptNumber') receiptNumber: string) {
    return this.paymentsService.findByReceiptNumber(receiptNumber);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s payments' })
  getTodayPayments() {
    return this.paymentsService.getTodayPayments();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get daily payment summary' })
  getSummary() {
    return this.paymentsService.getSummary();
  }

  @Get('search/range')
  @ApiOperation({ summary: 'Find payments between two dates' })
  async findByDateRange(
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.paymentsService.findByDateRange(new Date(start), new Date(end));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  // ⚡ FINAL STEP: Enhanced Admin-Only Reversal Endpoint with Dual Security [cite: 2026-01-10]
  @Post(':id/reverse')
  @UseGuards(JwtAuthGuard, RolesGuard) // 👈 Double guard for maximum security
  @SetMetadata('roles', ['admin']) // 👈 Metadata for RolesGuard to check admin role
  @ApiOperation({ 
    summary: 'Reverse a payment (Admin Only)',
    description: 'Policy [2026-01-10]: Only administrators can reverse transactions. This creates a complete audit trail and restores loan balance.' 
  })
  async reversePayment(
    @Param('id') id: number, 
    @Body('reason') reason: string, 
    @Request() req: any
  ) {
    // The RolesGuard already validates admin role, but we keep user extraction
    const adminUser = req.user;
    
    return await this.paymentsService.reversePayment(id, adminUser, reason);
  }

  // ⚡ ALTERNATIVE: Original reversal endpoint (kept for backward compatibility)
  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Reverse payment (Legacy endpoint)' })
  async legacyReversePayment(
    @Param('id') id: string,
    @Body() reverseDto: ReversePaymentDto,
    @Request() req: any,
  ) {
    const adminName = req.user?.username || req.user?.email || 'System Administrator';
    const userRole = req.user?.role;
    
    if (userRole !== 'admin') {
      throw new ForbiddenException('Policy [2026-01-10]: Only administrators can reverse payments');
    }
    
    return this.paymentsService.reversePayment(
      +id, 
      req.user, // Pass user object instead of just name
      reverseDto.reversal_reason
    );
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete payment (Not Allowed)', 
    description: 'Payments should not be deleted. Use reversal instead for audit trail compliance.' 
  })
  remove(@Param('id') id: string) {
    throw new ForbiddenException('Payments should not be deleted. Use reversal instead for audit trail compliance. Policy [2026-01-10]');
  }
}
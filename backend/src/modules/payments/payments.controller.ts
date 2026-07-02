import { assertAdmin, assertRole, getEffectiveRole } from '../../common/helpers/role-helper';
import { AuthRequest } from '../../common/helpers/role-helper';
import { Throttle } from '@nestjs/throttler';
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
  SetMetadata,
  ParseIntPipe,
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
  @Throttle({ default: { ttl: 60_000, limit: 10 } })  // 10 payment submissions/min per IP
  @ApiOperation({ summary: 'Create a new payment' })
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req: AuthRequest) {
    // ✅ POLICY: Only cashier, manager, admin can record payments — not agents
    const role = getEffectiveRole(req?.user);
    if (role === 'agent') {
      throw new ForbiddenException('Policy [2026-01-10]: Agents are not authorised to record payments');
    }

    // PHASE 4.1: branch assignment required only for branch-scoped roles
    // Admin and manager operate tenant-wide and may have branchId = null
    const BRANCH_SCOPED_ROLES = ['cashier', 'teller', 'credit_officer', 'branch_manager'];
    if (BRANCH_SCOPED_ROLES.includes(role) && !req?.user?.branchId) {
      throw new ForbiddenException(
        'Branch assignment required for financial operations.',
      );
    }

    const serviceDto = {
      loanId:        createPaymentDto.loan_id,
      amount:        createPaymentDto.amount,
      paymentMethod: createPaymentDto.payment_method,
      receiptNumber: createPaymentDto.receipt_number,
      paymentDate:   createPaymentDto.payment_date ? new Date(createPaymentDto.payment_date) : new Date(),
      transactionId: createPaymentDto.transaction_id,
      notes:         createPaymentDto.notes,
      collectedBy:   createPaymentDto.collected_by,
      scheduleId:    createPaymentDto.schedule_id,
      cashDrawerId:  (createPaymentDto as any).cash_drawer_id,
      tenantId:      req?.user?.tenantId,
    };
    return this.paymentsService.create(serviceDto, (req as any).requestId);
  }

  @Get()
  @ApiOperation({ summary: 'Get payments — cursor-paginated. Pass ?cursor=<lastId>&limit=50' })
  findAll(
    @Request() req: AuthRequest,
    @Query('limit')  limit?:  number,
    @Query('cursor') cursor?: number,
  ) {
    return this.paymentsService.findAll(
      req?.user?.tenantId,
      limit ? +limit : 50,
      cursor ? +cursor : undefined,
    );
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get payments by loan ID' })
  findByLoanId(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.paymentsService.findByLoanId(loanId);
  }

  @Get('receipt/:receiptNumber')
  @ApiOperation({ summary: 'Get payment by receipt number' })
  findByReceiptNumber(@Param('receiptNumber') receiptNumber: string) {
    return this.paymentsService.findByReceiptNumber(receiptNumber);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s payments' })
  getTodayPayments(@Request() req: AuthRequest) {
    return this.paymentsService.getTodayPayments(req?.user?.tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get daily payment summary, scoped to the caller\'s tenant' })
  getSummary(@Request() req: AuthRequest) {
    return this.paymentsService.getSummary(req.user?.tenantId);
  }

  @Get('search/range')
  @ApiOperation({ summary: 'Find payments between two dates' })
  async findByDateRange(
    @Request() req: AuthRequest,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.paymentsService.findByDateRange(new Date(start), new Date(end), req?.user?.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
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
    @Request() req: AuthRequest
  ) {
    // The RolesGuard already validates admin role, but we keep user extraction
    const adminUser = req.user;
    
    return await this.paymentsService.reversePayment(id, adminUser, reason);
  }

  // ⚡ ALTERNATIVE: Original reversal endpoint (kept for backward compatibility)
  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Reverse payment (Legacy endpoint)' })
  async legacyReversePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() reverseDto: ReversePaymentDto,
    @Request() req: AuthRequest,
  ) {
    const adminName = req.user?.username || req.user?.email || 'System Administrator';
    assertAdmin(req.user, 'Policy [2026-01-10]: Only administrators can reverse payments');
    
    return this.paymentsService.reversePayment(
      id, 
      req.user, // Pass user object instead of just name
      reverseDto.reversal_reason
    );
  }


  // ── REVERSAL REQUEST WORKFLOW ─────────────────────────────

  // GET pending requests (admin view)
  @Get('reversal-requests')
  @ApiOperation({ summary: 'Get all pending reversal requests (Admin only)' })
  async getPendingReversalRequests(@Request() req: AuthRequest) {
    const user = req.user;
    assertRole(user, ['admin', 'manager'], 'Admin or manager access required');
    return this.paymentsService.getPendingReversalRequests(user?.tenantId);
  }

  // Cashier submits a reversal request
  @Post(':id/request-reversal')
  @ApiOperation({ summary: 'Request a reversal (cashier submits, admin approves)' })
  async requestReversal(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: AuthRequest,
  ) {
    const user = req.user;
    const requestedBy = user.email || user.username;
    return this.paymentsService.requestReversal(id, requestedBy, reason);
  }

  // Admin approves a reversal request
  @Post(':id/approve-reversal')
  @ApiOperation({ summary: 'Approve a reversal request (Admin only)' })
  async approveReversal(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.paymentsService.approveReversalRequest(id, req.user);
  }

  // Admin rejects a reversal request
  @Post(':id/reject-reversal')
  @ApiOperation({ summary: 'Reject a reversal request (Admin only)' })
  async rejectReversal(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: AuthRequest,
  ) {
    return this.paymentsService.rejectReversalRequest(id, req.user, reason);
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
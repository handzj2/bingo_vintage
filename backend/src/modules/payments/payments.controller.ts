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
  BadRequestException,
  Query,
  SetMetadata,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Create a new payment' })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Request() req: AuthRequest) {
    // Only cashier, manager, admin can record payments — not agents
    const role = getEffectiveRole(req?.user);
    if (role === 'agent') {
      throw new ForbiddenException('Policy [2026-01-10]: Agents are not authorised to record payments');
    }

    // Branch assignment required only for branch-scoped roles
    // Admin and manager operate tenant-wide and may have branchId = null
    const BRANCH_SCOPED_ROLES = ['cashier', 'teller', 'credit_officer', 'branch_manager'];
    if (BRANCH_SCOPED_ROLES.includes(role) && !req?.user?.branchId) {
      throw new ForbiddenException(
        'Branch assignment required for financial operations.',
      );
    }

    // Backdated payments only by admin/superadmin, with required reason + audit
    let isBackdated = false;
    let paymentDate = new Date();
    if (createPaymentDto.payment_date) {
      const requested = new Date(createPaymentDto.payment_date);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      if (!isNaN(requested.getTime())) {
        paymentDate = requested;
        if (requested < todayStart) {
          isBackdated = true;
          if (role !== 'admin' && role !== 'superadmin') {
            throw new ForbiddenException(
              'Policy: backdated payments can only be entered by an administrator. ' +
              "Record this payment with today's date, or ask an admin to enter it.",
            );
          }
          const reason = (createPaymentDto.backdate_reason || '').trim();
          if (reason.length < 5) {
            throw new BadRequestException(
              'backdate_reason is required (min 5 characters) when posting a backdated payment.',
            );
          }
        }
      }
    }

    const serviceDto = {
      loanId:        createPaymentDto.loan_id,
      amount:        createPaymentDto.amount,
      paymentMethod: createPaymentDto.payment_method,
      receiptNumber: createPaymentDto.receipt_number,
      paymentDate,
      transactionId: createPaymentDto.transaction_id,
      notes:         isBackdated
        ? `[BACKDATE] ${createPaymentDto.backdate_reason}${createPaymentDto.notes ? ' | ' + createPaymentDto.notes : ''}`
        : createPaymentDto.notes,
      collectedBy:   createPaymentDto.collected_by,
      scheduleId:    createPaymentDto.schedule_id,
      cashDrawerId:  (createPaymentDto as any).cash_drawer_id,
      idempotencyKey: createPaymentDto.idempotency_key,
      tenantId:      req?.user?.tenantId,
    };

    const result = await this.paymentsService.create(serviceDto, (req as any).requestId);

    if (isBackdated && this.auditService) {
      try {
        await this.auditService.logAction({
          action: 'PAYMENT_BACKDATE',
          tableName: 'payments',
          recordId: (result as any)?.payment?.id || (result as any)?.id,
          user: req.user?.username || req.user?.email || String(req.user?.id),
          description: `Backdated payment to ${createPaymentDto.payment_date}`,
          tenantId: req.user?.tenantId,
          metadata: {
            backdate_reason: createPaymentDto.backdate_reason,
            loan_id: createPaymentDto.loan_id,
            amount: createPaymentDto.amount,
          },
        });
      } catch (_) { /* non-fatal */ }
    }

    return result;
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

  @Get('preview-allocation')
  @ApiOperation({ summary: 'Dry-run chronological payment allocation (no writes)' })
  previewAllocation(
    @Query('loanId', ParseIntPipe) loanId: number,
    @Query('amount') amount: string,
  ) {
    return this.paymentsService.previewAllocation(loanId, Number(amount));
  }

  // Static path must be declared before :id param routes
  @Get('reversal-requests')
  @ApiOperation({ summary: 'Get all pending reversal requests (Admin only)' })
  async getPendingReversalRequests(@Request() req: AuthRequest) {
    const user = req.user;
    assertRole(user, ['admin', 'manager'], 'Admin or manager access required');
    return this.paymentsService.getPendingReversalRequests(user?.tenantId);
  }

  @Post(':id/reverse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SetMetadata('roles', ['admin'])
  @ApiOperation({
    summary: 'Reverse a payment (Admin Only)',
    description:
      'Policy [2026-01-10]: Only administrators can reverse transactions. This creates a complete audit trail and restores loan balance.',
  })
  async reversePayment(
    @Param('id') id: number,
    @Body('reason') reason: string,
    @Request() req: AuthRequest,
  ) {
    return await this.paymentsService.reversePayment(id, req.user, reason);
  }

  // Legacy reversal endpoint (kept for backward compatibility)
  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Reverse payment (Legacy endpoint)' })
  async legacyReversePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() reverseDto: ReversePaymentDto,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Policy [2026-01-10]: Only administrators can reverse payments');
    return this.paymentsService.reversePayment(id, req.user, reverseDto.reversal_reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    // Tenant-scoped — cannot fetch another tenant's payment by ID
    return this.paymentsService.findOne(id, req?.user?.tenantId);
  }

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

  @Post(':id/approve-reversal')
  @ApiOperation({ summary: 'Approve a reversal request (Admin only)' })
  async approveReversal(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user, 'Policy [2026-01-10]: Only administrators can approve payment reversals');
    return this.paymentsService.approveReversalRequest(id, req.user);
  }

  @Post(':id/reject-reversal')
  @ApiOperation({ summary: 'Reject a reversal request (Admin only)' })
  async rejectReversal(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Policy [2026-01-10]: Only administrators can reject payment reversals');
    return this.paymentsService.rejectReversalRequest(id, req.user, reason);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete payment (Not Allowed)',
    description: 'Payments should not be deleted. Use reversal instead for audit trail compliance.',
  })
  remove(@Param('id') id: string) {
    throw new ForbiddenException(
      'Payments should not be deleted. Use reversal instead for audit trail compliance. Policy [2026-01-10]',
    );
  }
}

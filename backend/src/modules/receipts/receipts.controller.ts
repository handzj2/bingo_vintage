import {
  Controller, Get, Param, ParseIntPipe,
  UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';
import { getEffectiveRole } from '../../common/helpers/role-helper';

/**
 * ReceiptsController — Phase 2
 *
 * CHANGES FROM ORIGINAL
 * ─────────────────────
 * Lines 34 + 58:
 *   BEFORE: if (user.role === 'agent') { throw ... }
 *   AFTER:  if (getEffectiveRole(user) === 'agent') { throw ... }
 *
 * getEffectiveRole() resolves the correct role name from dynamic or legacy
 * system — the exclusion logic itself is unchanged.
 */
@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get('payment/:id')
  @ApiOperation({ summary: 'Get receipt by payment ID (tenant-isolated, audit-logged)' })
  async getByPaymentId(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const user = req.user;

    // Phase 4 — tenantId guaranteed non-null after JwtStrategy hardening.
    // Guard here is a defence-in-depth layer in case this endpoint is ever
    // accessed outside the normal JWT guard path.
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Your account has no organisation assigned. Contact your administrator.',
      );
    }

    const tenantId = user.tenantId;   // Phase 4: no ?? 1
    const actor    = user.email || user.username || String(user.userId);
    const ip       = req.ip || req.headers?.['x-forwarded-for'] || '';

    // Phase 2: getEffectiveRole() instead of user.role
    if (getEffectiveRole(user) === 'agent') {
      throw new ForbiddenException('Agents are not authorised to print receipts');
    }

    return this.receiptsService.getReceiptData(id, tenantId, actor, ip);
  }

  @Get('by-number/:receiptNumber')
  @ApiOperation({ summary: 'Get receipt by receipt number string' })
  async getByNumber(
    @Param('receiptNumber') receiptNumber: string,
    @Request() req: any,
  ) {
    const user = req.user;

    if (!user.tenantId) {
      throw new ForbiddenException(
        'Your account has no organisation assigned. Contact your administrator.',
      );
    }

    const tenantId = user.tenantId;   // Phase 4: no ?? 1
    const actor    = user.email || user.username || String(user.userId);
    const ip       = req.ip || req.headers?.['x-forwarded-for'] || '';

    // Phase 2: getEffectiveRole() instead of user.role
    if (getEffectiveRole(user) === 'agent') {
      throw new ForbiddenException('Agents are not authorised to print receipts');
    }

    return this.receiptsService.getReceiptByNumber(receiptNumber, tenantId, actor, ip);
  }

  @Get('loan/:loanId')
  @ApiOperation({ summary: 'List receipt summaries for a loan' })
  async getByLoan(
    @Param('loanId', ParseIntPipe) loanId: number,
    @Request() req: any,
  ) {
    if (!req.user.tenantId) {
      throw new ForbiddenException(
        'Your account has no organisation assigned. Contact your administrator.',
      );
    }
    const tenantId = req.user.tenantId;   // Phase 4: no ?? 1
    return this.receiptsService.getReceiptsByLoan(loanId, tenantId);
  }
}

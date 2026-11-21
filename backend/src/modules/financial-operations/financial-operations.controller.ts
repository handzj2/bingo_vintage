import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest, assertAdmin, hasPermission } from '../../common/helpers/role-helper';
import { FinancialOperationsService } from './financial-operations.service';
import { FinTxnType } from './entities/fin-transaction.entity';

import { ModuleEntitlementGuard } from '../module-control/guards/module-entitlement.guard';
import { RequireModule } from '../module-control/decorators/require-module.decorator';
@ApiTags('Financial Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleEntitlementGuard)
@RequireModule('financial_operations')
@Controller('financial-operations')
export class FinancialOperationsController {
  constructor(private readonly service: FinancialOperationsService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'List financial transactions' })
  async listTxns(
    @Request() req: AuthRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listTransactions(req.user.tenantId, {
      status,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('deposits')
  @ApiOperation({ summary: 'List client deposits' })
  async listDeposits(@Request() req: AuthRequest, @Query('clientId') clientId?: string) {
    return this.service.listDeposits(
      req.user.tenantId,
      clientId ? Number(clientId) : undefined,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List financial categories' })
  async categories(@Request() req: AuthRequest) {
    return this.service.listCategories(req.user.tenantId);
  }

  @Post('receive')
  @ApiOperation({ summary: 'Record money received / deposit / fine / other income' })
  async receive(@Body() body: any, @Request() req: AuthRequest) {
    const userId = req.user.userId ?? req.user.id;
    return this.service.receiveMoney({
      tenantId: req.user.tenantId,
      branchId: body.branchId ?? req.user.branchId ?? null,
      amount: Number(body.amount),
      type: body.type || FinTxnType.MONEY_IN,
      categoryId: body.categoryId,
      clientId: body.clientId,
      cashDrawerId: body.cashDrawerId,
      reference: body.reference,
      idempotencyKey: body.idempotencyKey,
      description: body.description,
      reason: body.reason,
      txnDate: body.txnDate,
      createdById: userId,
      postImmediately: !!body.postImmediately,
    });
  }

  @Post('deposits/:id/allocate')
  @ApiOperation({ summary: 'Allocate deposit to loan / down-payment' })
  async allocate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    return this.service.allocateDeposit({
      tenantId: req.user.tenantId,
      depositId: id,
      amount: Number(body.amount),
      loanId: body.loanId,
      createdById: req.user.userId ?? req.user.id,
    });
  }

  @Post('deposits/:id/refund')
  @ApiOperation({ summary: 'Refund unallocated deposit balance' })
  async refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    return this.service.refundDeposit({
      tenantId: req.user.tenantId,
      depositId: id,
      amount: Number(body.amount),
      cashDrawerId: body.cashDrawerId,
      reference: body.reference,
      idempotencyKey: body.idempotencyKey,
      reason: body.reason,
      createdById: req.user.userId ?? req.user.id,
    });
  }
}

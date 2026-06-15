import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReconciliationController {
  constructor(private readonly reconService: ReconciliationService) {}

  @Get()
  @RequirePermission('finance.reconcile')
  @ApiOperation({ summary: 'Get reconciliation history (optionally filtered by drawer)' })
  async getHistory(
    @Request() req,
    @Query('branchId') branchId?: number,
    @Query('drawerId') drawerId?: number,
  ) {
    // Phase 5.1 RESTORED: branchId and drawerId filters forwarded to service
    return this.reconService.findAll(
      req.user.tenantId,
      branchId ? +branchId : undefined,
      drawerId ? +drawerId : undefined,
    );
  }

  @Post()
  @RequirePermission('finance.reconcile')
  @ApiOperation({ summary: 'Create a new reconciliation' })
  async create(@Body() dto: CreateReconciliationDto, @Request() req) {
    return this.reconService.create({ drawerId: dto.drawerId, actualCash: dto.actualCash }, req.user);
  }

  @Get('expected')
  @RequirePermission('finance.reconcile')
  @ApiOperation({ summary: 'Get expected cash for a drawer' })
  async getExpectedCash(@Query('drawerId') drawerId: number, @Request() req) {
    const result = await this.reconService.getExpected(drawerId, req.user?.tenantId);
    return result;
  }
}
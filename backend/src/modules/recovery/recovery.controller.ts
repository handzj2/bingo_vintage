import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest, assertAdmin } from '../../common/helpers/role-helper';
import { RecoveryService } from './recovery.service';

@ApiTags('Motorcycle Recovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recovery')
export class RecoveryController {
  constructor(private readonly service: RecoveryService) {}

  @Get()
  @ApiOperation({ summary: 'List recovery cases' })
  list(@Request() req: AuthRequest, @Query('status') status?: string) {
    return this.service.list(req.user.tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recovery case with inspections and settlements' })
  getOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.getCase(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Open a recovery case' })
  open(@Body() body: any, @Request() req: AuthRequest) {
    return this.service.openCase({
      tenantId: req.user.tenantId,
      branchId: body.branchId ?? req.user.branchId ?? null,
      loanId: Number(body.loanId),
      caseType: body.caseType,
      notes: body.notes,
      openedById: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/authorise')
  @ApiOperation({ summary: 'Authorise recovery (admin)' })
  authorise(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin required to authorise recovery');
    return this.service.authorise({
      tenantId: req.user.tenantId,
      caseId: id,
      notes: body.notes,
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/custody')
  @ApiOperation({ summary: 'Record motorcycle taken into custody' })
  custody(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.takeCustody({
      tenantId: req.user.tenantId,
      caseId: id,
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/inspect')
  @ApiOperation({ summary: 'Record inspection' })
  inspect(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    return this.service.recordInspection({
      tenantId: req.user.tenantId,
      caseId: id,
      conditionNotes: body.conditionNotes,
      estimatedValue: body.estimatedValue != null ? Number(body.estimatedValue) : undefined,
      odometer: body.odometer != null ? Number(body.odometer) : undefined,
      photosCount: body.photosCount != null ? Number(body.photosCount) : 0,
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/settlement')
  @ApiOperation({ summary: 'Prepare settlement statement (report only — no write-off)' })
  settlement(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin required to prepare settlement');
    return this.service.prepareSettlement({
      tenantId: req.user.tenantId,
      caseId: id,
      bikeEstimatedValue: body.bikeEstimatedValue != null ? Number(body.bikeEstimatedValue) : undefined,
      notes: body.notes,
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close recovery case; bike → RECOVERY_CLEARED for reassignment' })
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin required to close recovery case');
    return this.service.closeCase({
      tenantId: req.user.tenantId,
      caseId: id,
      reason: body.reason,
      userId: req.user.userId ?? req.user.id,
    });
  }
}

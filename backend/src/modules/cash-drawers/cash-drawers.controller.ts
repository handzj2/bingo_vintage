// GET / accepts branchId/userId filters for the branch drawer-overview page.
import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CashDrawerService } from './cash-drawers.service';
import { OpenDrawerDto } from './dto/open-drawer.dto';
import { CloseDrawerDto } from './dto/close-drawer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('cash-drawers')
@ApiBearerAuth()
@Controller('cash-drawers')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CashDrawerController {
  constructor(private readonly drawerService: CashDrawerService) {}

  @Post('open')
  @RequirePermission('drawer.open')
  @ApiOperation({ summary: 'Open a new cash drawer for the branch/business day' })
  async open(@Body() dto: OpenDrawerDto, @Request() req) {
    return this.drawerService.open(req.user, dto.openingBalance, {
      isOverride: dto.isOverride,
      overrideReason: dto.overrideReason,
    });
  }

  @Get('current')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: "Get current open drawer for logged-in user's branch" })
  async getCurrent(@Request() req) {
    return this.drawerService.getCurrent(req.user);
  }

  @Get()
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'List all drawers for this tenant (open + closed)' })
  async findAll(
    @Request() req,
    @Query('status')   status?:   string,
    @Query('branchId') branchId?: string,
    @Query('userId')   userId?:   string,
  ) {
    return this.drawerService.findAll(
      req.user.tenantId,
      status,
      branchId ? +branchId : undefined,
      userId   ? +userId   : undefined,
    );
  }

  @Get('summaries')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: "Today's transaction totals + balance for every open drawer at a branch" })
  async getSummaries(
    @Request() req,
    @Query('branchId') branchId?: string,
  ) {
    return this.drawerService.getOpenDrawerSummaries(
      req.user.tenantId,
      branchId ? +branchId : req.user.branchId,
    );
  }

  @Get('history')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Get drawer history' })
  async getHistory(
    @Request() req,
    @Query('branchId') branchId?: number,
    @Query('userId')   userId?:   number,
  ) {
    return this.drawerService.findAll(
      req.user.tenantId,
      undefined,
      branchId ? +branchId : undefined,
      userId   ? +userId   : undefined,
    );
  }

  @Get(':id/summary')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: "Today's transaction totals + balance for one drawer" })
  async getDrawerSummary(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.drawerService.getSummary(id, req.user.tenantId);
  }

  @Get(':id')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Get a single cash drawer' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.drawerService.findOne(id, req.user.tenantId);
  }

  @Post('close/:id')
  @RequirePermission('drawer.close')
  @ApiOperation({ summary: 'Close a drawer (same-day)' })
  async close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseDrawerDto,
    @Request() req,
  ) {
    // Force-close is a stricter permission; controller still accepts the flag
    // but service + PermissionGuard combination enforces drawer.force_close
    // for late drawers (PermissionGuard is checked first; service re-validates).
    return this.drawerService.close(id, req.user, dto.actualCash, {
      forceClose: dto.forceClose,
      forceReason: dto.forceReason,
      discrepancyReason: (dto as any).discrepancyReason,
    });
  }

  @Post('force-close/:id')
  @RequirePermission('drawer.force_close')
  @ApiOperation({ summary: 'Force-close an overdue drawer (requires counted cash + reason)' })
  async forceClose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseDrawerDto,
    @Request() req,
  ) {
    return this.drawerService.close(id, req.user, dto.actualCash, {
      forceClose: true,
      forceReason: dto.forceReason,
      discrepancyReason: (dto as any).discrepancyReason,
    });
  }
}

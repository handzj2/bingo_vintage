// patch 2026-06-21: GET / now accepts branchId/userId filters (previously
// only GET /history did); added GET /summaries — bulk per-drawer totals
// for the branch drawer-overview page (one card per cashier)
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
  @RequirePermission('drawer.manage')
  @ApiOperation({ summary: 'Open a new cash drawer' })
  async open(@Body() dto: OpenDrawerDto, @Request() req) {
    return this.drawerService.open(req.user, dto.openingBalance);
  }

  @Get('current')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: "Get current open drawer for logged-in user" })
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

  // Bulk version of getSummary — avoids N+1 calls when a manager views
  // all open drawers at a branch side by side (one cashier per drawer).
  @Get('summaries')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Today\'s transaction totals + balance for every open drawer at a branch' })
  async getSummaries(
    @Request() req,
    @Query('branchId') branchId?: string,
  ) {
    return this.drawerService.getOpenDrawerSummaries(
      req.user.tenantId,
      branchId ? +branchId : req.user.branchId,
    );
  }

  // Single-drawer version of getSummary — used by the "My Drawer" self-service
  // page so a cashier can see their own live balance + today's totals.
  @Get(':id/summary')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Today\'s transaction totals + balance for one drawer' })
  async getDrawerSummary(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.drawerService.getSummary(id, req.user.tenantId);
  }

  // FIX: GET :id — also called by ReconciliationDashboard to show drawer details.
  @Get(':id')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Get a single cash drawer' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.drawerService.findOne(id, req.user.tenantId);
  }

  @Post('close/:id')
  @RequirePermission('drawer.manage')
  @ApiOperation({ summary: 'Close a drawer' })
  async close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseDrawerDto,
    @Request() req,
  ) {
    return this.drawerService.close(id, req.user, dto.actualCash);
  }

  @Get('history')
  @RequirePermission('drawer.manage')
  @ApiOperation({ summary: 'Get drawer history' })
  async getHistory(
    @Request() req,
    @Query('branchId') branchId?: number,
    @Query('userId')   userId?:   number,
  ) {
    // Phase 5.1 RESTORED: branchId and userId filters forwarded to service
    return this.drawerService.findAll(
      req.user.tenantId,
      undefined,
      branchId ? +branchId : undefined,
      userId   ? +userId   : undefined,
    );
  }
}

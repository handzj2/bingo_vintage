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
  @ApiOperation({ summary: 'Open a new cash drawer' })
  async open(@Body() dto: OpenDrawerDto, @Request() req) {
    return this.drawerService.open(req.user, dto.openingBalance);
  }

  @Get('current')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: "Get current open drawer for logged-in user" })
  async getCurrent(@Request() req) {
    return this.drawerService.getCurrent(req.user.id, req.user.tenantId);
  }

  // FIX: Missing GET / endpoint.
  // ExpenseForm and ReconciliationDashboard call GET /cash-drawers to populate
  // the drawer dropdown.  Without this the select stays empty and cash_drawer_id
  // is never submitted, causing every approved expense to skip the drawer deduction.
  @Get()
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'List all drawers for this tenant (open + closed)' })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
  ) {
    return this.drawerService.findAll(req.user.tenantId, status);
  }

  // FIX: GET :id — also called by ReconciliationDashboard to show drawer details.
  @Get(':id')
  @RequirePermission('drawer.view')
  @ApiOperation({ summary: 'Get a single cash drawer' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.drawerService.findOne(id, req.user.tenantId);
  }

  @Post('close/:id')
  @RequirePermission('drawer.close')
  @ApiOperation({ summary: 'Close a drawer' })
  async close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseDrawerDto,
    @Request() req,
  ) {
    return this.drawerService.close(id, req.user, dto.actualCash);
  }

  @Get('history')
  @RequirePermission('drawer.reconcile')
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

// patch 2026-06-16
import { Controller, Get, Query, UseGuards, Res, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { AuthRequest }   from '../../common/helpers/role-helper';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'superadmin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @ApiOperation({ summary: 'Daily collections summary' })
  getDaily(@Request() req: AuthRequest, @Query('date') date?: string) {
    return this.reportsService.getDailySummary(
      req.user.tenantId,
      date ? new Date(date) : new Date(),
    );
  }

  @Get('weekly-collections')
  @ApiOperation({ summary: '7-day payment sparkline data' })
  getWeekly(@Request() req: AuthRequest) {
    return this.reportsService.getWeeklyCollections(req.user.tenantId);
  }

  @Get('arrears')
  @ApiOperation({ summary: 'Overdue loans arrears report' })
  getArrears(@Request() req: AuthRequest) {
    return this.reportsService.getArrearsReport(req.user.tenantId);
  }

  @Get('portfolio-aging')
  @ApiOperation({ summary: 'Portfolio aging buckets (30/60/90/90+ days)' })
  getAging(@Request() req: AuthRequest) {
    return this.reportsService.getPortfolioAging(req.user.tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Full portfolio summary for dashboard' })
  getSummary(@Request() req: AuthRequest) {
    return this.reportsService.getPortfolioSummary(req.user.tenantId);
  }

  @Get('export/payments')
  @ApiOperation({ summary: 'Download payments as CSV' })
  async exportPayments(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?: string,
    @Res() res?: any,
  ) {
    const csv = await this.reportsService.getPaymentsCsv(req.user.tenantId, startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
    return res.send(csv);
  }

  @Get('export/loans')
  @ApiOperation({ summary: 'Download all loans as CSV' })
  async exportLoans(@Request() req: AuthRequest, @Res() res?: any) {
    const csv = await this.reportsService.getLoansCsv(req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="loans-${Date.now()}.csv"`);
    return res.send(csv);
  }

  @Get('export/clients')
  @ApiOperation({ summary: 'Download all clients as CSV' })
  async exportClients(@Request() req: AuthRequest, @Res() res?: any) {
    const csv = await this.reportsService.getClientsCsv(req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="clients-${Date.now()}.csv"`);
    return res.send(csv);
  }

  // ── Daily Payment Accountability ──────────────────────────────────────
  @Get('daily-accountability')
  @ApiOperation({ summary: 'All payments recorded on a given day, tenant-wide or one branch' })
  getDailyAccountability(
    @Request() req: AuthRequest,
    @Query('date') date?: string,
    @Query('branchId') branchId?: number,
  ) {
    return this.reportsService.getDailyPaymentAccountability(
      req.user.tenantId,
      date ? new Date(date) : new Date(),
      branchId ? +branchId : undefined,
    );
  }

  @Get('export/daily-accountability')
  @ApiOperation({ summary: 'Download Daily Payment Accountability as Excel (.xlsx)' })
  async exportDailyAccountability(
    @Request() req: AuthRequest,
    @Res() res: any,
    @Query('date') date?: string,
    @Query('branchId') branchId?: number,
  ) {
    const buffer = await this.reportsService.getDailyPaymentAccountabilityExcel(
      req.user.tenantId,
      date ? new Date(date) : new Date(),
      branchId ? +branchId : undefined,
    );
    const day = (date || new Date().toISOString().slice(0, 10));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="daily-accountability-${day}.xlsx"`);
    return res.send(buffer);
  }

  // ── Upcoming Due Installments ─────────────────────────────────────────
  @Get('upcoming-due')
  @ApiOperation({ summary: 'Loan installments due within the next N days (default 7)' })
  getUpcomingDue(
    @Request() req: AuthRequest,
    @Query('days') days?: number,
    @Query('branchId') branchId?: number,
  ) {
    return this.reportsService.getUpcomingDue(
      req.user.tenantId,
      days ? +days : 7,
      branchId ? +branchId : undefined,
    );
  }

  @Get('export/upcoming-due')
  @ApiOperation({ summary: 'Download Upcoming Due Installments as Excel (.xlsx)' })
  async exportUpcomingDue(
    @Request() req: AuthRequest,
    @Res() res: any,
    @Query('days') days?: number,
    @Query('branchId') branchId?: number,
  ) {
    const buffer = await this.reportsService.getUpcomingDueExcel(
      req.user.tenantId,
      days ? +days : 7,
      branchId ? +branchId : undefined,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="upcoming-due-${Date.now()}.xlsx"`);
    return res.send(buffer);
  }

  // ── Cash Drawer Balancing ─────────────────────────────────────────────
  @Get('drawer-balancing')
  @ApiOperation({ summary: 'Per-drawer opening/collected/expenses/expected vs actual cash, for a date range' })
  getDrawerBalancing(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: number,
  ) {
    return this.reportsService.getDrawerBalancing(
      req.user.tenantId, startDate, endDate, branchId ? +branchId : undefined,
    );
  }

  @Get('export/drawer-balancing')
  @ApiOperation({ summary: 'Download Cash Drawer Balancing as Excel (.xlsx)' })
  async exportDrawerBalancing(
    @Request() req: AuthRequest,
    @Res() res: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: number,
  ) {
    const buffer = await this.reportsService.getDrawerBalancingExcel(
      req.user.tenantId, startDate, endDate, branchId ? +branchId : undefined,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="drawer-balancing-${Date.now()}.xlsx"`);
    return res.send(buffer);
  }
}

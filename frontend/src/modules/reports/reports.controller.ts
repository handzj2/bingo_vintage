import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard }   from '../auth/guards/roles.guard';
import { Roles }        from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @ApiOperation({ summary: 'Daily collections summary' })
  getDaily(@Query('date') date?: string) {
    return this.reportsService.getDailySummary(date ? new Date(date) : new Date());
  }

  @Get('weekly-collections')
  @ApiOperation({ summary: '7-day payment sparkline data' })
  getWeekly() {
    return this.reportsService.getWeeklyCollections();
  }

  @Get('arrears')
  @ApiOperation({ summary: 'Overdue loans arrears report' })
  getArrears() {
    return this.reportsService.getArrearsReport();
  }

  @Get('portfolio-aging')
  @ApiOperation({ summary: 'Portfolio aging buckets (30/60/90/90+ days)' })
  getAging() {
    return this.reportsService.getPortfolioAging();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Full portfolio summary for dashboard' })
  getSummary() {
    return this.reportsService.getPortfolioSummary();
  }

  // ── CSV exports ────────────────────────────────────────────────────────
  @Get('export/payments')
  @ApiOperation({ summary: 'Download payments as CSV' })
  async exportPayments(
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?: string,
    @Res() res?: any,
  ) {
    const csv = await this.reportsService.getPaymentsCsv(startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
    return res.send(csv);
  }

  @Get('export/loans')
  @ApiOperation({ summary: 'Download all loans as CSV' })
  async exportLoans(@Res() res?: any) {
    const csv = await this.reportsService.getLoansCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="loans-${Date.now()}.csv"`);
    return res.send(csv);
  }

  @Get('export/clients')
  @ApiOperation({ summary: 'Download all clients as CSV' })
  async exportClients(@Res() res?: any) {
    const csv = await this.reportsService.getClientsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="clients-${Date.now()}.csv"`);
    return res.send(csv);
  }
}
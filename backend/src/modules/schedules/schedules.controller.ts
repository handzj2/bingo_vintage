import {
  Controller, Get, Post, Patch, Param, Query,
  ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulesService } from './schedules.service';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // Loan repayment schedule
  @Get('loan/:loanId')
  @ApiOperation({ summary: 'Get repayment schedule for a loan' })
  getLoanSchedule(@Param('loanId', ParseIntPipe) loanId: number) {
    return this.schedulesService.getLoanSchedule(loanId);
  }

  // Alerts
  @Get('alerts')
  @ApiOperation({ summary: 'Get all active alerts' })
  getAlerts(
    @Query('type')      type?: string,
    @Query('severity')  severity?: string,
    @Query('unread')    unread?: string,
  ) {
    return this.schedulesService.getAlerts({
      type,
      severity,
      unreadOnly: unread === 'true',
    });
  }

  @Get('alerts/summary')
  @ApiOperation({ summary: 'Alert counts summary for dashboard' })
  getAlertSummary() {
    return this.schedulesService.getAlertSummary();
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.schedulesService.markAlertRead(id);
  }

  @Patch('alerts/mark-all-read')
  @ApiOperation({ summary: 'Mark all alerts as read' })
  markAllRead() {
    return this.schedulesService.markAllRead();
  }

  @Patch('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  resolveAlert(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const who = req.user?.username || req.user?.email || 'system';
    return this.schedulesService.resolveAlert(id, who);
  }

  // Manual overdue scan trigger (admin)
  @Post('run-overdue-scan')
  @ApiOperation({ summary: 'Admin: manually trigger overdue detection scan' })
  runScan() {
    return this.schedulesService.runOverdueScan();
  }
}
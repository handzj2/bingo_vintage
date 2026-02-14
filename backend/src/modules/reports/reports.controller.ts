import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard) // 🔐 Global protection for this module
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @Roles('admin') // 🔐 Restricted per 2026 policy [cite: 2026-01-10]
  @ApiOperation({ summary: 'Get total collections for a specific day' })
  async getDaily(@Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return await this.reportsService.getDailySummary(date);
  }

  @Get('arrears')
  @Roles('admin') // 🔐 Only Admin can view debt status [cite: 2026-01-10]
  @ApiOperation({ summary: 'Get comprehensive arrears report for all active loans' })
  async getArrears() {
    return await this.reportsService.getArrearsReport();
  }
}
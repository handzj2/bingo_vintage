import { hasPermission, isAdmin, isBranchScopedRole } from '../../common/helpers/role-helper';
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.dashboardService.getSummary(req.user.tenantId, start, end);
  }

  @Get('product-kpis')
  async getProductKpis(@Req() req) {
    return this.dashboardService.getProductKpis(req.user.tenantId);
  }

  /**
   * Pending-work summary for notification centre + sidebar badges.
   * Returns counts and item lists for loans / expenses / reversals
   * the current user is permitted to act on, scoped to their tenant
   * (and branch when the role is branch-scoped).
   */
  @Get('pending-work')
  async getPendingWork(@Req() req) {
    const user = req.user;
    const branchId = isBranchScopedRole(user) ? user.branchId : undefined;
    // hasPermission() lets admin/superadmin through and reads the real permission set.
    const caps = {
      loan:       hasPermission(user, 'loan.approve'),
      expense:    hasPermission(user, 'expense.approve'),
      reversal:   hasPermission(user, 'payment.reverse') || hasPermission(user, 'payment.reversal.approve'),
      correction: hasPermission(user, 'loan.approve_correction'),
      drawer:     hasPermission(user, 'drawer.force_close'),
    };
    // Admins also get the classified database diagnostic for any queue that fails to load;
    // everyone else gets only a reference id (the full detail is in the server log).
    return this.dashboardService.getPendingWork(user.tenantId, branchId, caps, { includeDiagnostics: isAdmin(user) });
  }
}
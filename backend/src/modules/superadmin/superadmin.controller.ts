import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { SuperAdminService } from './superadmin.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ImpersonateDto }  from './dto/impersonate.dto';
import { AuthRequest }     from '../../common/helpers/role-helper';

@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly svc: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide stats' })
  stats() { return this.svc.getStats(); }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants' })
  listTenants() { return this.svc.listTenants(); }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant with users' })
  getTenant(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getTenant(id);
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create tenant + seed roles + admin user' })
  createTenant(@Body() dto: CreateTenantDto, @Request() req: AuthRequest) {
    return this.svc.createTenant(dto, req.user.id);
  }

  @Patch('tenants/:id/activate')
  @ApiOperation({ summary: 'Activate a tenant' })
  activate(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.svc.setTenantStatus(id, true, req.user.id);
  }

  @Patch('tenants/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a tenant' })
  deactivate(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.svc.setTenantStatus(id, false, req.user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users across all tenants' })
  listUsers(@Query('search') search?: string) {
    return this.svc.listAllUsers(search);
  }

  @Post('impersonate')
  @ApiOperation({ summary: 'Impersonate a tenant user (15-min token)' })
  impersonate(@Body() dto: ImpersonateDto, @Request() req: AuthRequest) {
    return this.svc.impersonate(dto, req.user.id);
  }

  @Get('tenants/:id/branches')
  @ApiOperation({ summary: 'List branches for a tenant' })
  listBranches(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listTenantBranches(id);
  }

  @Post('tenants/:id/branches')
  @ApiOperation({ summary: 'Create a branch for a tenant' })
  createBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name: string; location?: string; managerName?: string; contactPhone?: string },
    @Request() req: AuthRequest,
  ) {
    return this.svc.createBranch(id, data, req.user.id);
  }

  @Patch('branches/:id/activate')
  @ApiOperation({ summary: 'Activate a branch' })
  activateBranch(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.svc.toggleBranch(id, true, req.user.id);
  }

  @Patch('branches/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a branch' })
  deactivateBranch(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.svc.toggleBranch(id, false, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View all audit logs' })
  auditLogs(
    @Query('page')  page  = '1',
    @Query('limit') limit = '50',
  ) {
    return this.svc.getAuditLogs(Number(page), Number(limit));
  }
}

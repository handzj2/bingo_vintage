import {
  Controller, Get, Put, Body, Param, Query,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { ModuleControlService, AccessState, VisibilityState, CommercialStatus } from './module-control.service';

/**
 * Provider-only Module Control Centre API.
 * Mounted under /superadmin/modules to sit beside existing Super Admin routes.
 */
@ApiTags('Module Control Centre')
@ApiBearerAuth()
@Controller('superadmin/modules')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ModuleControlController {
  constructor(private readonly svc: ModuleControlService) {}

  @Get()
  @ApiOperation({ summary: 'List registered modules (catalogue)' })
  listRegistry() {
    return this.svc.listRegistry();
  }

  @Get('history')
  @ApiOperation({ summary: 'Module access change history' })
  history(
    @Query('tenantId') tenantId?: string,
    @Query('moduleKey') moduleKey?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getHistory({
      tenantId: tenantId ? Number(tenantId) : undefined,
      moduleKey,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  // Static path segments MUST be registered before :moduleKey
  @Get('tenant/:tenantId/effective')
  @ApiOperation({ summary: 'Effective module states for one tenant' })
  effectiveForTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.svc.listEffectiveForTenant(tenantId);
  }

  @Get('tenant/:tenantId/effective/:moduleKey')
  @ApiOperation({ summary: 'Effective state for one module on one tenant' })
  effectiveOne(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('moduleKey') moduleKey: string,
  ) {
    return this.svc.getEffectiveState(tenantId, moduleKey);
  }

  @Put('tenant/:tenantId/:moduleKey')
  @ApiOperation({ summary: 'Set tenant module entitlement (access, visibility, commercial)' })
  setTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('moduleKey') moduleKey: string,
    @Body()
    body: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      commercialStatus?: CommercialStatus;
      commercialRef?: string;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      reason?: string;
    },
    @Request() req: any,
  ) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.svc.setTenantEntitlement(tenantId, moduleKey, body, actorId);
  }

  @Put('product/:moduleKey')
  @ApiOperation({ summary: 'Set product-wide module policy (elevated)' })
  setProduct(
    @Param('moduleKey') moduleKey: string,
    @Body()
    body: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      reason?: string;
    },
    @Request() req: any,
  ) {
    const actorId = req.user?.id ?? req.user?.userId;
    return this.svc.setProductPolicy(moduleKey, body, actorId);
  }

  @Get(':moduleKey')
  @ApiOperation({ summary: 'Module detail + dependencies' })
  getModule(@Param('moduleKey') moduleKey: string) {
    return this.svc.getModule(moduleKey);
  }
}

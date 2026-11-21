import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleControlService } from './module-control.service';

/**
 * Authenticated (any role) read of effective module entitlements for the caller's tenant.
 * Used by Sidebar / layout to apply HIDDEN vs VISIBLE and to route DISABLED modules
 * to the restricted landing page.
 */
@ApiTags('Module Entitlements')
@ApiBearerAuth()
@Controller('module-entitlements')
@UseGuards(JwtAuthGuard)
export class ModuleEntitlementsController {
  constructor(private readonly svc: ModuleControlService) {}

  @Get('me')
  @ApiOperation({ summary: 'Effective modules for the authenticated tenant' })
  async me(@Request() req: any) {
    const tenantId = req.user?.tenantId ?? req.user?.tenant_id ?? null;
    if (!tenantId) {
      // Superadmin without tenant context: return registry defaults as enabled catalogue
      const registry = await this.svc.listRegistry();
      return registry.map((m) => ({
        moduleKey: m.moduleKey,
        name: m.name,
        accessState: m.defaultAccessState,
        visibilityState: m.defaultVisibility,
        commercialStatus: 'ACTIVE',
        isIndependentlyControllable: m.isIndependentlyControllable,
        frontendRoutePrefixes: m.frontendRoutePrefixes,
      }));
    }
    const list = await this.svc.listEffectiveForTenant(Number(tenantId));
    return list.map((m) => ({
      moduleKey: m.moduleKey,
      name: m.name,
      accessState: m.accessState,
      visibilityState: m.visibilityState,
      commercialStatus: m.commercialStatus,
      isIndependentlyControllable: m.isIndependentlyControllable,
      frontendRoutePrefixes: m.frontendRoutePrefixes,
    }));
  }
}

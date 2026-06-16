// patch 2026-06-16: fix AuthRequest import path + tenant-aware GET/PATCH
// Option A: tenant-scoped settings controller
// 2026-06-16: GET and PATCH scoped to requesting user's tenant
import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { RolesGuard }    from '../auth/guards/roles.guard';
import { Roles }         from '../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { AuthRequest }   from '../../common/helpers/role-helper';

@ApiTags('System Settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('admin', 'manager', 'superadmin')  // restrict — cashiers/agents don't need settings
  @ApiOperation({ summary: 'Get all settings for the requesting user tenant' })
  async getAll(@Request() req: AuthRequest) {
    const tenantId = req.user?.tenantId;
    // Superadmin (tenantId=null) sees global settings
    // All other users see their tenant's merged settings
    if (!tenantId) return this.settingsService.getAllForTenant(null);
    return this.settingsService.getAllForTenant(tenantId);
  }

  @Patch(':key')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Update a setting for the requesting user tenant' })
  async update(
    @Param('key') key: string,
    @Body('value') value: string,
    @Request() req: AuthRequest,
  ) {
    const tenantId = req.user?.tenantId ?? null;
    return this.settingsService.updateSetting(key, value, tenantId ?? undefined);
  }
}

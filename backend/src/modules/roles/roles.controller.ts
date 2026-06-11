import {
  Controller, Get, Post, Patch, Delete, Body,
  Param, ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesService } from './roles.service';

/**
 * RolesController — /roles
 *
 * Admin-only endpoints for managing dynamic roles.
 * Tenant isolation is enforced via req.user.tenantId.
 */
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles for the current tenant' })
  findAll(@Request() req: any) {
    return this.rolesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.rolesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new role (admin only)' })
  create(@Body() body: { name: string; description?: string; isDefault?: boolean }, @Request() req: any) {
    return this.rolesService.create(body, req.user.tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update role name / description (admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; isDefault?: boolean },
    @Request() req: any,
  ) {
    return this.rolesService.update(id, body, req.user.tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a role (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.rolesService.remove(id, req.user.tenantId);
  }

  // ── Permission assignment ─────────────────────────────────────

  @Post(':id/permissions')
  @Roles('admin')
  @ApiOperation({ summary: 'Grant a permission to a role (admin only)' })
  assignPermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { permissionCode: string },
    @Request() req: any,
  ) {
    return this.rolesService.assignPermission(id, { permissionCode: body.permissionCode, grantedBy: req.user.userId }, req.user.tenantId);
  }

  @Post(':id/permissions/set')
  @Roles('admin')
  @ApiOperation({ summary: 'Replace ALL permissions for a role atomically (admin only)' })
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { codes: string[] },
    @Request() req: any,
  ) {
    return this.rolesService.setPermissions(id, body.codes, req.user.tenantId, req.user.userId);
  }

  @Delete(':id/permissions/:code')
  @Roles('admin')
  @ApiOperation({ summary: 'Revoke a permission from a role (admin only)' })
  revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('code') code: string,
    @Request() req: any,
  ) {
    return this.rolesService.revokePermission(id, code, req.user.tenantId);
  }
}

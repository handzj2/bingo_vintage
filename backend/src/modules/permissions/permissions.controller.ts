import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsService, CreatePermissionDto } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions visible to current tenant' })
  findAll(@Request() req: any) {
    return this.permissionsService.findAll(req.user?.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a custom permission (admin only)' })
  create(@Body() dto: CreatePermissionDto, @Request() req: any) {
    return this.permissionsService.create(dto, req.user?.tenantId);
  }

  @Delete(':code')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a permission by code (admin only)' })
  remove(@Param('code') code: string) {
    return this.permissionsService.remove(code);
  }
}

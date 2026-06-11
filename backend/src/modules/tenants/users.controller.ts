import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  assertAdmin,
  AuthRequest,
} from '../../common/helpers/role-helper';

@ApiTags('Admin — Tenants')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/tenants')
export class TenantUsersController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (admin only)' })
  findAll(@Request() req: AuthRequest) {
    assertAdmin(req.user, 'Admin access required');  // ← use helper
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tenant' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user);
    return this.tenantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tenant (admin only)' })
  create(@Body() data: any, @Request() req: AuthRequest) {
    assertAdmin(req.user);
    return this.tenantsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant (admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Request() req: AuthRequest) {
    assertAdmin(req.user);
    return this.tenantsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tenant (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user);
    return this.tenantsService.remove(id);
  }
}
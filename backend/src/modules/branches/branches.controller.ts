import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  assertAdmin as helperAssertAdmin,
  assertRole  as helperAssertRole,
  AuthRequest,
} from '../../common/helpers/role-helper';

/**
 * BranchesController — Phase 2
 *
 * CHANGES FROM ORIGINAL
 * ─────────────────────
 * Private helpers assertAdmin() and assertAdminOrManager() now delegate to
 * the shared role-helper instead of reading user.role directly.
 * All route handlers and service calls are unchanged.
 */
@ApiTags('Admin — Branches')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches (admin/manager)' })
  findAll(@Query('tenantId') tenantId: string, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    return this.branchesService.findAll(tenantId ? Number(tenantId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single branch' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    return this.branchesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a branch (admin only)' })
  create(@Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.branchesService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch (admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.branchesService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a branch (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.branchesService.remove(id);
  }

  // Phase 2: delegate to shared helper — no more raw user.role reads
  private assertAdmin(req: any) {
    helperAssertAdmin(req.user, 'Admin access required');
  }

  private assertAdminOrManager(req: any) {
    helperAssertRole(req.user, ['admin', 'manager'], 'Admin or manager access required');
  }
}

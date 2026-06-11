import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoanProductsService } from './loan-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  assertAdmin as helperAssertAdmin,
  assertRole  as helperAssertRole,
  AuthRequest,
} from '../../common/helpers/role-helper';

/**
 * LoanProductsController — Phase 2
 *
 * CHANGE: private assertAdmin() and assertAdminOrManager() delegate to helper.
 */
@ApiTags('Admin — Loan Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin/loan-products')
export class LoanProductsController {
  constructor(private readonly loanProductsService: LoanProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all loan products (admin/manager)' })
  findAll(@Query('tenantId') tenantId: string, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    return this.loanProductsService.findAll(tenantId ? Number(tenantId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan product' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    return this.loanProductsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a loan product (admin only)' })
  create(@Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.loanProductsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loan product (admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.loanProductsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a loan product (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    return this.loanProductsService.remove(id);
  }

  private assertAdmin(req: any) {
    helperAssertAdmin(req.user, 'Admin access required');
  }

  private assertAdminOrManager(req: any) {
    helperAssertRole(req.user, ['admin', 'manager'], 'Admin or manager access required');
  }
}

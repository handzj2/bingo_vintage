import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoanProductsService } from './loan-products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';
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

  /** Loads a product and rejects access to another tenant's product (IDOR guard). */
  private async ownedProduct(id: number, req: AuthRequest) {
    const product = await this.loanProductsService.findOne(id);
    if (req.user?.tenantId && product.tenantId !== req.user.tenantId) {
      throw new ForbiddenException('This loan product belongs to another tenant');
    }
    return product;
  }

  @Get()
  @ApiOperation({ summary: 'List all loan products (admin/manager)' })
  findAll(@Query('tenantId') tenantId: string, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    // Tenant users are always scoped to their own tenant; only superadmin (no tenantId) may pass one.
    const scope = req.user?.tenantId ?? (tenantId ? Number(tenantId) : undefined);
    return this.loanProductsService.findAll(scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan product' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdminOrManager(req);
    return this.ownedProduct(id, req);
  }

  @Post()
  @ApiOperation({ summary: 'Create a loan product (admin only)' })
  create(@Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    if (req.user?.tenantId) data = { ...data, tenantId: req.user.tenantId };
    return this.loanProductsService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loan product (admin only)' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    await this.ownedProduct(id, req);
    if (data && typeof data === 'object') delete data.tenantId; // never re-home a product
    return this.loanProductsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a loan product (admin only)' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    this.assertAdmin(req);
    await this.ownedProduct(id, req);
    return this.loanProductsService.remove(id);
  }

  private assertAdmin(req: any) {
    helperAssertAdmin(req.user, 'Admin access required');
  }

  private assertAdminOrManager(req: any) {
    helperAssertRole(req.user, ['admin', 'manager'], 'Admin or manager access required');
  }
}

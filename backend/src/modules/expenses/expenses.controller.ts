import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ── STATIC routes MUST come before parameterised :id routes ─────────────
  // BUG: original file registered GET :id before GET categories.
  // NestJS matches /expenses/categories → :id = "categories"
  // → ParseIntPipe throws 400.  Fix: move static paths to the top.

  @Get('categories')
  @Permissions('expense.create', 'expense.approve')
  @ApiOperation({ summary: 'Get all expense categories' })
  getCategories(@Request() req) {
    return this.expensesService.findCategories(req.user.tenantId);
  }

  @Post('categories')
  @RequirePermission('expense.create')
  @ApiOperation({ summary: 'Create a new expense category' })
  createCategory(@Body() body: { name: string; description?: string }, @Request() req) {
    return this.expensesService.createCategory(body.name, body.description, req.user.tenantId);
  }

  @Patch('categories/:id')
  @Permissions('expense.create', 'expense.approve')
  @ApiOperation({ summary: 'Update an expense category' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<{ name: string; description: string }>,
    @Request() req,
  ) {
    return this.expensesService.updateCategory(id, body, req.user.tenantId);
  }

  @Delete('categories/:id')
  @RequirePermission('expense.delete')
  @ApiOperation({ summary: 'Delete an expense category' })
  deleteCategory(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.expensesService.deleteCategory(id, req.user.tenantId);
  }

  // ── Expense CRUD ─────────────────────────────────────────────────────────

  @Post()
  @RequirePermission('expense.create')
  @ApiOperation({ summary: 'Create a new expense' })
  create(@Body() createDto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(createDto, req.user);
  }

  @Get()
  @Permissions('expense.create', 'expense.approve')
  @ApiOperation({ summary: 'List expenses — optional ?status=pending|approved|rejected' })
  findAll(@Request() req, @Query('status') status?: string) {
    return this.expensesService.findAll(req.user.tenantId, status as any);
  }

  @Get(':id')
  @Permissions('expense.create', 'expense.approve')
  @ApiOperation({ summary: 'Get expense details' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.expensesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Permissions('expense.create', 'expense.approve')
  @ApiOperation({ summary: 'Update a pending expense' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExpenseDto,
    @Request() req,
  ) {
    return this.expensesService.update(id, updateDto, req.user);
  }

  @Patch(':id/approve')
  @RequirePermission('expense.approve')
  @ApiOperation({ summary: 'Approve an expense' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.expensesService.approve(id, req.user);
  }

  @Patch(':id/reject')
  @RequirePermission('expense.approve')
  @ApiOperation({ summary: 'Reject an expense' })
  reject(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.expensesService.reject(id, req.user);
  }

  @Delete(':id')
  @RequirePermission('expense.delete')
  @ApiOperation({ summary: 'Delete a pending expense' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.expensesService.remove(id, req.user);
  }
}

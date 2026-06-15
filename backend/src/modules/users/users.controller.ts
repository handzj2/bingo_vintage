import {
  Controller, Get, Post, Body, Patch, Param, Delete, Put,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  assertAdmin,
  AuthRequest,
} from '../../common/helpers/role-helper';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all users (tenant-scoped)' })
  findAll(@Request() req: AuthRequest) {
    // Scoped to the calling user's tenant — superadmin never appears
    return this.usersService.findAll(req.user?.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Put(':id/change-password')
  @ApiOperation({ summary: 'Change own password (requires current password)' })
  changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account (Admin only)' })
  deactivate(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user, 'Admin only');
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivate a user account (Admin only)' })
  activate(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user, 'Admin only');
    return this.usersService.activate(id);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update user permissions (Admin only)' })
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissions') permissions: Record<string, boolean>,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin only');
    return this.usersService.updatePermissions(id, permissions);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user, 'Admin only');
    return this.usersService.remove(id);
  }
}

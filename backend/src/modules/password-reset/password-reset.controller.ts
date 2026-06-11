import {
  Controller, Post, Get, Body, Param,
  HttpCode, HttpStatus, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service';
import { RequestResetDto, VerifyOtpDto, SetNewPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  assertAdmin as helperAssertAdmin,
  assertRole  as helperAssertRole,
} from '../../common/helpers/role-helper';

/**
 * PasswordResetAuthController — Phase 2 (user-facing, no auth)
 * Unchanged from original.
 */
@ApiTags('Password Reset')
@Controller('auth')
export class PasswordResetAuthController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a password reset request (public)' })
  async requestReset(@Body() dto: RequestResetDto) {
    return this.service.requestReset(dto.email);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP — returns a resetToken, NOT a JWT',
    description: 'Frontend must redirect to /auth/set-new-password?token=<resetToken>',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(dto.email, dto.otp);
  }

  @Post('set-new-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set new password using resetToken (public)' })
  async setNewPassword(@Body() dto: SetNewPasswordDto) {
    return this.service.setNewPassword(dto.token, dto.newPassword);
  }
}

/**
 * PasswordResetAdminController — Phase 2
 *
 * CHANGES FROM ORIGINAL
 * ─────────────────────
 * private assertAdmin():
 *   BEFORE: if (req.user?.role !== 'admin') throw new Error(...)
 *   AFTER:  helperAssertAdmin(req.user, ...)   → proper ForbiddenException (403)
 *
 * private assertAdminOrManager():
 *   BEFORE: const { role } = req.user ?? {}; if (role !== 'admin' && role !== 'manager') throw new Error(...)
 *   AFTER:  helperAssertRole(req.user, ['admin','manager'], ...)  → proper ForbiddenException (403)
 *
 * Both helpers now throw ForbiddenException instead of plain Error,
 * giving correct HTTP 403 responses instead of 500s.
 */
@ApiTags('Admin — Password Resets')
@ApiBearerAuth()
@Controller('admin/reset-requests')
@UseGuards(JwtAuthGuard)
export class PasswordResetAdminController {
  constructor(private readonly service: PasswordResetService) {}

  @Get()
  @ApiOperation({ summary: 'List all password reset requests (admin/manager)' })
  async listRequests(@Request() req: any) {
    this.assertAdminOrManager(req);
    return this.service.listRequests();
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a reset request and generate OTP (admin)' })
  async approveRequest(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.service.approveRequest(id, req.user.userId, req.user.username);
  }

  // Phase 2: delegate to shared helpers — no raw user.role reads
  private assertAdmin(req: any) {
    helperAssertAdmin(req.user, 'Only admins can perform this action');
  }

  private assertAdminOrManager(req: any) {
    helperAssertRole(req.user, ['admin', 'manager'], 'Requires admin or manager role');
  }
}

/**
 * DTOs for the password-reset module.
 *
 * All inputs are validated by class-validator so malformed requests
 * are rejected at the controller boundary before reaching the service.
 */

import { IsString, MinLength, IsEmail, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Step 1 — user submits a reset request ────────────────────────────────────

export class RequestResetDto {
  @ApiProperty({ description: 'Email address of the account to reset' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

// ── Step 2 — user submits OTP for verification ───────────────────────────────

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email address used to identify the request' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ description: '6-digit OTP provided by the admin' })
  @IsString()
  @MinLength(6, { message: 'OTP must be 6 characters' })
  otp: string;
}

// ── Step 3 — user sets a new permanent password ───────────────────────────────

export class SetNewPasswordDto {
  @ApiProperty({ description: 'Reset token received after OTP verification (UUID)' })
  @IsUUID('4', { message: 'Invalid reset token format' })
  token: string;

  @ApiProperty({ description: 'New password — minimum 8 characters' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}

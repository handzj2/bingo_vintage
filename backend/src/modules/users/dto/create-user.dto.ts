// RBAC patch 2026-06-15: roleName field added (preferred over roleId)
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'john_doe' })
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'cashier', required: false, description: 'Role name (preferred over roleId — IDs vary per environment)' })
  roleName?: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 2, required: false, description: 'Role ID (deprecated — use roleName instead)' })
  roleId?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1, required: false })
  tenant_id?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1, required: false })
  branch_id?: number;
}
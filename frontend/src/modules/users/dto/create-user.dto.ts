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
  @IsNumber()
  @ApiProperty({ example: 2, required: false, description: 'Role ID from roles table' })
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
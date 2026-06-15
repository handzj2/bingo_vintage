import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'Can be either username or email address',
    example: 'john_doe OR john.doe@example.com'
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;
}
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

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
  @IsEnum(UserRole)
  @ApiProperty({ enum: UserRole, required: false, example: UserRole.USER })
  role?: UserRole;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'Can be either username or email address',
    example: 'john_doe OR john.doe@example.com'
  })
  username: string; // ✅ This field accepts either username OR email

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'password123', minLength: 6 })
  password: string;
}
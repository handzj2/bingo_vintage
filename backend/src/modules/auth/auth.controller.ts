import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Create a new user account with username, email, and password'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
    schema: {
      example: {
        id: 1,
        username: 'john_doe',
        email: 'john.doe@example.com',
        full_name: 'John Doe',
        role: 'user',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation error'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - username or email already exists'
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login user',
    description: 'Authenticate user and return JWT token. Username field accepts either username or email address.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Username field accepts either username or email address',
    examples: {
      loginWithUsername: {
        summary: 'Login with username',
        value: {
          username: 'john_doe',
          password: 'password123'
        }
      },
      loginWithEmail: {
        summary: 'Login with email',
        value: {
          username: 'john.doe@example.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          username: 'john_doe',
          email: 'john.doe@example.com',
          full_name: 'John Doe',
          role: 'user'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid credentials'
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
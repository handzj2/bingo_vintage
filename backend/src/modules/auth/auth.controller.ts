// RBAC patch 2026-06-15: /auth/me serializes Set<string> permissions to string[]
import {
  Controller, Post, Body, Get, Request,
  UseGuards, Patch,
} from '@nestjs/common';
import { AuthRequest } from '../../common/helpers/role-helper';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService }   from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * PHASE 10 — AuthController
 * Added: @Throttle on login/register — max 5 attempts per 60 seconds per IP
 */
@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with username/email + password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me(@Request() req: AuthRequest) {
    const u = req.user;
    // Serialize Set<string> to string[] for JSON transport.
    // Set does not serialize via JSON.stringify — produces {} instead of [...].
    const permissions = u.permissions instanceof Set
      ? Array.from(u.permissions)
      : (Array.isArray(u.permissions) ? u.permissions : []);
    return { ...u, permissions };
  }
}

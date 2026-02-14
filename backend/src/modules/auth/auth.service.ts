import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    console.log('Registering user:', dto.username);
    
    // Validate input
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    // Check for existing user
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: dto.email },
        { username: dto.username }
      ]
    });
    
    if (existingUser) {
      throw new ConflictException('Username or Email already exists');
    }

    // Create user
    const user = new User();
    user.username = dto.username;
    user.email = dto.email;
    user.fullName = dto.full_name;
    user.role = (dto.role as UserRole) || UserRole.CASHIER;
    user.isActive = true;
    user.password_hash = dto.password;
    
    console.log('User before save:', JSON.stringify(user, null, 2));
    console.log('Has passwordInternal?', (user as any).passwordInternal);
    console.log('Has password_hash getter?', user.password_hash);
    console.log('User object keys:', Object.keys(user));
    
    try {
      const savedUser = await this.userRepository.save(user);
      console.log('User saved successfully:', savedUser.id);
      console.log('Saved user structure:', JSON.stringify(savedUser, null, 2));
      
      // Generate token for the new user
      const payload = {
        sub: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
      };
      
      // Remove sensitive data from response
      const { passwordInternal, ...userWithoutPassword } = savedUser as any;
      
      console.log('Returning user without password');
      
      return {
        user: userWithoutPassword,
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      console.error('Save error:', error.message);
      console.error('Full error:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    // Find user by username or email
    const user = await this.userRepository.findOne({
      where: [
        { username: dto.username },
        { email: dto.username }
      ]
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password - this uses the entity's verifyPassword method
    const isValid = await user.verifyPassword(dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        fullName: user.fullName,
      },
    };
  }
}
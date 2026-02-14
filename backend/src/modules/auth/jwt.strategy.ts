import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-key'), // ✅ Added type and default
    });
  }

  async validate(payload: any) {
    // This attaches the user data to the Request object
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      email: payload.email, // ✅ Keep email if your JWT includes it
    };
  }
}
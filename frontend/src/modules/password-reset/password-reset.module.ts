/**
 * PasswordResetModule
 *
 * Self-contained module. Import it in AppModule alongside AuthModule.
 * It does NOT modify AuthModule — it only imports JwtModule from it.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PasswordResetRequest } from './entities/password-reset.entity';
import { PasswordResetService } from './password-reset.service';
import {
  PasswordResetAuthController,
  PasswordResetAdminController,
} from './password-reset.controller';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';  // for JwtAuthGuard

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetRequest, User]),
    AuditModule,
    AuthModule,   // exposes JwtAuthGuard + JwtStrategy
  ],
  controllers: [PasswordResetAuthController, PasswordResetAdminController],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}

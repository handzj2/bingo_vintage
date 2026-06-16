import { Module }       from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule }    from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService }    from './superadmin.service';
import { Tenant }  from '../tenants/entities/tenant.entity';
import { User }    from '../users/entities/user.entity';
import { Audit }   from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    SettingsModule,
    TypeOrmModule.forFeature([Tenant, User, Audit]),
    JwtModule.registerAsync({
      imports: [
    SettingsModule,ConfigModule],
      inject:  [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret:      cs.get('JWT_SECRET'),
        signOptions: { expiresIn: cs.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [SuperAdminController],
  providers:   [SuperAdminService],
})
export class SuperAdminModule {}

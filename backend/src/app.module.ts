import { ThrottlerModule } from '@nestjs/throttler';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PaymentsModule }       from './modules/payments/payments.module';
import { AuthModule }           from './modules/auth/auth.module';
import { ClientsModule }        from './modules/clients/clients.module';
import { LoansModule }          from './modules/loans/loans.module';
import { BikesModule }          from './modules/bikes/bikes.module';
import { ReportsModule }        from './modules/reports/reports.module';
import { SettingsModule }       from './modules/settings/settings.module';
import { UsersModule }          from './modules/users/users.module';
import { AuditModule }          from './modules/audit/audit.module';
import { SchedulesModule }      from './modules/schedules/schedules.module';
import { ReceiptsModule }       from './modules/receipts/receipts.module';
import { SyncModule }           from './modules/sync/sync.module';
import { SmsModule }            from './modules/sms/sms.module';
import { PasswordResetModule }  from './modules/password-reset/password-reset.module';
import { ExpensesModule }       from './modules/expenses/expenses.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { CashDrawersModule }    from './modules/cash-drawers/cash-drawers.module';
import { HealthModule }         from './modules/health/health.module';
import { BranchesModule }       from './modules/branches/branches.module';
import { DashboardModule }      from './modules/dashboard/dashboard.module';
import { LoanProductsModule }   from './modules/loan-products/loan-products.module';
import { PermissionsModule }    from './modules/permissions/permissions.module';
import { RolesModule }          from './modules/roles/roles.module';
import { TenantsModule }        from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawUrl  = configService.get<string>('DATABASE_URL') ?? '';
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');

        // Strip sslmode param — TypeORM ssl option controls this.
        // pg v8 treats sslmode=require as verify-full (needs CA cert).
        // Removing it and using ssl:{rejectUnauthorized:false} is correct
        // for Railway's public proxy (rlwy.net).
        const databaseUrl = rawUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');

        if (databaseUrl) {
          try {
            const u = new URL(databaseUrl);
            console.log('DB HOST:', u.host);
          } catch { console.log('DB URL parse error'); }
        }

        const isExternal = !!(
          rawUrl.includes('rlwy.net') ||
          rawUrl.includes('supabase') ||
          rawUrl.includes('neon')
        );

        return {
          type:             'postgres',
          url:              databaseUrl || undefined,
          autoLoadEntities: true,
          entities:         ['dist/**/*.entity.js'],
          migrations:       ['dist/database/migrations/*.js'],
          migrationsRun:    false,
          synchronize:      false,
          namingStrategy:   new SnakeNamingStrategy(),
          retryAttempts:    2147483647,
          retryDelay:       5000,
          extra: {
            min: 0,
            max: 10,
            connectionTimeoutMillis: 10_000,
            idleTimeoutMillis:       30_000,
          },
          ssl:     isExternal ? { rejectUnauthorized: false } : false,
          logging: ['error'],
        };
      },
    }),

    AuthModule, ClientsModule, LoansModule, PaymentsModule,
    BikesModule, ReportsModule, SettingsModule, UsersModule,
    AuditModule, SchedulesModule, ReceiptsModule, SyncModule, SmsModule,
    PasswordResetModule, ExpensesModule, ReconciliationModule, CashDrawersModule,
    HealthModule,
    BranchesModule, DashboardModule, LoanProductsModule,
    PermissionsModule, RolesModule, TenantsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

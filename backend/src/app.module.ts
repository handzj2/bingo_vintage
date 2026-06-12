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
// C5: six modules present on disk but missing from AppModule — routes were returning 404
import { BranchesModule }       from './modules/branches/branches.module';
import { DashboardModule }      from './modules/dashboard/dashboard.module';
import { LoanProductsModule }   from './modules/loan-products/loan-products.module';
import { PermissionsModule }    from './modules/permissions/permissions.module';
import { RolesModule }          from './modules/roles/roles.module';
import { TenantsModule }        from './modules/tenants/tenants.module';

/**
 * PHASE 2 — AppModule
 * Changes:
 *   • migrationsRun: true  — app auto-runs pending migrations on startup
 *   • migrations path wired to dist/database/migrations
 *   • synchronize: false enforced in all environments
 *   • HealthModule added
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl:   60_000,  // 1 minute window
      limit: 100,     // max 100 requests per IP per window
    }]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv     = configService.get<string>('NODE_ENV', 'development');

        // Temporary diagnostic — remove after confirmed working
        console.log('DATABASE_URL present:', !!databaseUrl);
        if (databaseUrl) {
          try {
            const u = new URL(databaseUrl);
            console.log('DB HOST:', u.host);
            console.log('DB PROTOCOL:', u.protocol);
          } catch { console.log('DB URL parse error'); }
        }

        return {
          type: 'postgres',
          url:  databaseUrl,
          autoLoadEntities: true,
          entities:   ['dist/**/*.entity.js'],
          migrations: ['dist/database/migrations/*.js'],

          // PHASE 2: migrations run automatically on startup
          migrationsRun: true,

          // PHASE 2: synchronize ALWAYS false — migrations are authoritative
          synchronize: false,

          namingStrategy: new SnakeNamingStrategy(),

          // retryAttempts: 0 — TypeORM will not crash the process on
          // connection failure. HTTP server starts immediately.
          // DB reconnects automatically when it becomes available.
          retryAttempts: 0,

          extra: {
            min: 1,
            max: 10,
            connectionTimeoutMillis: 10_000,
            idleTimeoutMillis:       30_000,
          },

          // Railway internal network: SSL not required (internal hostname).
          // External providers (supabase, neon) require SSL.
          // DATABASE_URL from Railway plugin uses *.railway.internal — no SSL needed.
          ssl: (databaseUrl && (
            databaseUrl.includes('supabase') ||
            databaseUrl.includes('neon') ||
            databaseUrl.includes('rlwy.net')
          )) ? { rejectUnauthorized: false } : false,

          logging: nodeEnv === 'development' ? ['error', 'warn', 'migration'] : ['error', 'migration'],
        };
      },
    }),

    AuthModule, ClientsModule, LoansModule, PaymentsModule,
    BikesModule, ReportsModule, SettingsModule, UsersModule,
    AuditModule, SchedulesModule, ReceiptsModule, SyncModule, SmsModule,
    PasswordResetModule, ExpensesModule, ReconciliationModule, CashDrawersModule,
    HealthModule,
    // C5 — previously unregistered modules (all routes were 404)
    BranchesModule, DashboardModule, LoanProductsModule,
    PermissionsModule, RolesModule, TenantsModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * AWS / Stripe request-ID pattern.
   * Attaches a UUID to every request so all log lines from one request
   * can be correlated in Railway's log stream or any observability sink.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

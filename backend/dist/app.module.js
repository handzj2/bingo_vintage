"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const payments_module_1 = require("./modules/payments/payments.module");
const auth_module_1 = require("./modules/auth/auth.module");
const clients_module_1 = require("./modules/clients/clients.module");
const loans_module_1 = require("./modules/loans/loans.module");
const bikes_module_1 = require("./modules/bikes/bikes.module");
const reports_module_1 = require("./modules/reports/reports.module");
const settings_module_1 = require("./modules/settings/settings.module");
const users_module_1 = require("./modules/users/users.module");
const audit_module_1 = require("./modules/audit/audit.module");
const schedules_module_1 = require("./modules/schedules/schedules.module");
const receipts_module_1 = require("./modules/receipts/receipts.module");
const sync_module_1 = require("./modules/sync/sync.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: configService.get('DB_PORT', 5432),
                    username: configService.get('DB_USERNAME', 'postgres'),
                    password: configService.get('DB_PASSWORD', '@1'),
                    database: configService.get('DB_NAME', 'bikesure_db'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: configService.get('NODE_ENV') !== 'production',
                    logging: configService.get('NODE_ENV') === 'development',
                    extra: {
                        max: 20,
                        connectionTimeoutMillis: 5000,
                    },
                }),
            }),
            auth_module_1.AuthModule,
            clients_module_1.ClientsModule,
            loans_module_1.LoansModule,
            payments_module_1.PaymentsModule,
            bikes_module_1.BikesModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            users_module_1.UsersModule,
            audit_module_1.AuditModule,
            schedules_module_1.SchedulesModule,
            receipts_module_1.ReceiptsModule,
            sync_module_1.SyncModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
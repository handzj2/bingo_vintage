import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleRegistry } from './entities/module-registry.entity';
import { TenantModuleEntitlement } from './entities/tenant-module-entitlement.entity';
import { ProductModulePolicy } from './entities/product-module-policy.entity';
import { ModuleAccessHistory } from './entities/module-access-history.entity';
import { ModuleControlService } from './module-control.service';
import { ModuleControlController } from './module-control.controller';
import { ModuleEntitlementsController } from './module-entitlements.controller';
import { ModuleEntitlementGuard } from './guards/module-entitlement.guard';

/**
 * Global so ModuleEntitlementGuard + ModuleControlService can be injected
 * into any feature module without circular imports.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleRegistry,
      TenantModuleEntitlement,
      ProductModulePolicy,
      ModuleAccessHistory,
    ]),
  ],
  controllers: [ModuleControlController, ModuleEntitlementsController],
  providers: [ModuleControlService, ModuleEntitlementGuard],
  exports: [ModuleControlService, ModuleEntitlementGuard, TypeOrmModule],
})
export class ModuleControlModule {}

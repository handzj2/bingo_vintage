import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ModuleRegistry } from './entities/module-registry.entity';
import { TenantModuleEntitlement } from './entities/tenant-module-entitlement.entity';
import { ProductModulePolicy } from './entities/product-module-policy.entity';
import { ModuleAccessHistory } from './entities/module-access-history.entity';
import {
  resolveEffectiveAccess,
  normalizeCommercialForStorage,
  AccessState,
  VisibilityState,
  CommercialStatus,
} from './resolve-effective-access';

export type { AccessState, VisibilityState, CommercialStatus };

export interface EffectiveModuleState {
  moduleKey: string;
  name: string;
  description: string | null;
  category: string;
  commercialClass: string;
  isIndependentlyControllable: boolean;
  accessState: AccessState;
  visibilityState: VisibilityState;
  commercialStatus: CommercialStatus;
  source: 'tenant' | 'product' | 'registry_default';
  accessDeniedReason?: string;
  frontendRoutePrefixes: string[] | null;
  backendRoutePrefixes: string[] | null;
  permissionCodes: string[] | null;
  dependencies: { dependsOnKey: string; dependencyType: string; notes: string | null }[];
  dependents: { moduleKey: string; dependencyType: string }[];
}

@Injectable()
export class ModuleControlService {
  private readonly logger = new Logger(ModuleControlService.name);
  private readonly productCode = 'bingo_vintage';

  constructor(
    @InjectRepository(ModuleRegistry)
    private readonly registryRepo: Repository<ModuleRegistry>,
    @InjectRepository(TenantModuleEntitlement)
    private readonly tenantEntRepo: Repository<TenantModuleEntitlement>,
    @InjectRepository(ProductModulePolicy)
    private readonly productPolicyRepo: Repository<ProductModulePolicy>,
    @InjectRepository(ModuleAccessHistory)
    private readonly historyRepo: Repository<ModuleAccessHistory>,
    private readonly dataSource: DataSource,
  ) {}

  async listRegistry() {
    return this.registryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getModule(moduleKey: string) {
    const mod = await this.registryRepo.findOne({ where: { moduleKey } });
    if (!mod) throw new NotFoundException(`Module "${moduleKey}" not found in registry`);
    const deps = await this.dataSource.query(
      `SELECT depends_on_key AS "dependsOnKey", dependency_type AS "dependencyType", notes
         FROM module_dependencies WHERE module_key = $1`,
      [moduleKey],
    );
    const dependents = await this.dataSource.query(
      `SELECT module_key AS "moduleKey", dependency_type AS "dependencyType"
         FROM module_dependencies WHERE depends_on_key = $1`,
      [moduleKey],
    );
    return { ...mod, dependencies: deps, dependents };
  }

  /**
   * Authoritative effective state — single resolution path used by guards, nav, and admin UI.
   */
  async getEffectiveState(tenantId: number | null | undefined, moduleKey: string): Promise<EffectiveModuleState> {
    const mod = await this.registryRepo.findOne({ where: { moduleKey, isActive: true } });
    if (!mod) throw new NotFoundException(`Module "${moduleKey}" not found`);

    const product = await this.productPolicyRepo.findOne({
      where: { productCode: this.productCode, moduleKey },
    });

    let tenant: TenantModuleEntitlement | null = null;
    if (tenantId) {
      tenant = await this.tenantEntRepo.findOne({ where: { tenantId, moduleKey } });
    }

    const resolved = resolveEffectiveAccess({
      isIndependentlyControllable: mod.isIndependentlyControllable,
      registryDefaultAccess: (mod.defaultAccessState as AccessState) || 'ENABLED',
      registryDefaultVisibility: (mod.defaultVisibility as VisibilityState) || 'VISIBLE',
      productAccess: product?.accessState as AccessState | undefined,
      productVisibility: product?.visibilityState as VisibilityState | undefined,
      tenantAccess: tenant?.accessState as AccessState | undefined,
      tenantVisibility: tenant?.visibilityState as VisibilityState | undefined,
      commercialStatus: (tenant?.commercialStatus as CommercialStatus) ?? 'ACTIVE',
      expiresAt: tenant?.expiresAt ?? null,
      trialEndsAt: tenant?.trialEndsAt ?? null,
    });

    const dependencies = await this.dataSource.query(
      `SELECT depends_on_key AS "dependsOnKey", dependency_type AS "dependencyType", notes
         FROM module_dependencies WHERE module_key = $1`,
      [moduleKey],
    );
    const dependents = await this.dataSource.query(
      `SELECT module_key AS "moduleKey", dependency_type AS "dependencyType"
         FROM module_dependencies WHERE depends_on_key = $1`,
      [moduleKey],
    );

    return {
      moduleKey: mod.moduleKey,
      name: mod.name,
      description: mod.description,
      category: mod.category,
      commercialClass: mod.commercialClass,
      isIndependentlyControllable: mod.isIndependentlyControllable,
      accessState: resolved.accessState,
      visibilityState: resolved.visibilityState,
      commercialStatus: resolved.commercialStatus,
      source: resolved.source,
      accessDeniedReason: resolved.accessDeniedReason,
      frontendRoutePrefixes: mod.frontendRoutePrefixes,
      backendRoutePrefixes: mod.backendRoutePrefixes,
      permissionCodes: mod.permissionCodes,
      dependencies,
      dependents,
    };
  }

  async listEffectiveForTenant(tenantId: number): Promise<EffectiveModuleState[]> {
    const mods = await this.listRegistry();
    const out: EffectiveModuleState[] = [];
    for (const m of mods) {
      out.push(await this.getEffectiveState(tenantId, m.moduleKey));
    }
    return out;
  }

  async isAccessAllowed(tenantId: number | null | undefined, moduleKey: string): Promise<boolean> {
    try {
      const state = await this.getEffectiveState(tenantId, moduleKey);
      if (!state.isIndependentlyControllable) return true;
      return state.accessState === 'ENABLED';
    } catch (e) {
      // Fail closed for known controllable keys would require registry hit;
      // unknown key → allow so unregistered routes are not broken.
      this.logger.warn(`isAccessAllowed(${moduleKey}): ${(e as Error).message}`);
      return true;
    }
  }

  async setTenantEntitlement(
    tenantId: number,
    moduleKey: string,
    patch: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      commercialStatus?: CommercialStatus;
      commercialRef?: string;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      reason?: string;
    },
    actorUserId: number,
  ) {
    const mod = await this.registryRepo.findOne({ where: { moduleKey } });
    if (!mod) throw new NotFoundException(`Module "${moduleKey}" not found`);
    if (!mod.isIndependentlyControllable) {
      throw new BadRequestException(
        `Module "${moduleKey}" is shared core infrastructure and cannot be commercially suspended independently.`,
      );
    }

    if (patch.accessState === 'DISABLED') {
      await this.assertSafeToDisable(tenantId, moduleKey);
    }

    // RESTORED is an event — persist ACTIVE/TRIAL; history keeps the restoration
    const trialDate = patch.trialEndsAt ? new Date(patch.trialEndsAt) : null;
    const storedCommercial = normalizeCommercialForStorage(patch.commercialStatus, {
      trialEndsAt: trialDate,
    });
    const restorationRequested = patch.commercialStatus === 'RESTORED';

    return this.dataSource.transaction(async (em) => {
      let row = await em.findOne(TenantModuleEntitlement, { where: { tenantId, moduleKey } });
      const prev = row
        ? {
            access: row.accessState,
            visibility: row.visibilityState,
            commercial: row.commercialStatus,
          }
        : {
            access: mod.defaultAccessState,
            visibility: mod.defaultVisibility,
            commercial: 'ACTIVE',
          };

      if (!row) {
        row = em.create(TenantModuleEntitlement, {
          tenantId,
          moduleKey,
          accessState: patch.accessState ?? (mod.defaultAccessState as AccessState),
          visibilityState: patch.visibilityState ?? (mod.defaultVisibility as VisibilityState),
          commercialStatus: storedCommercial ?? 'ACTIVE',
        });
      }

      if (patch.accessState) row.accessState = patch.accessState;
      if (patch.visibilityState) row.visibilityState = patch.visibilityState;
      if (storedCommercial !== undefined) row.commercialStatus = storedCommercial;
      if (patch.commercialRef !== undefined) row.commercialRef = patch.commercialRef ?? null;
      if (patch.trialEndsAt !== undefined) {
        row.trialEndsAt = patch.trialEndsAt ? new Date(patch.trialEndsAt) : null;
      }
      if (patch.expiresAt !== undefined) {
        row.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
      }
      if (patch.reason !== undefined) row.reason = patch.reason ?? null;
      row.updatedById = actorUserId;

      // Restoring commercially: ensure access is enabled unless explicitly left disabled
      if (restorationRequested && !patch.accessState) {
        row.accessState = 'ENABLED';
      }

      const saved = await em.save(TenantModuleEntitlement, row);

      await em.save(
        ModuleAccessHistory,
        em.create(ModuleAccessHistory, {
          productCode: this.productCode,
          tenantId,
          moduleKey,
          scope: 'tenant',
          previousAccessState: prev.access,
          newAccessState: saved.accessState,
          previousVisibility: prev.visibility,
          newVisibility: saved.visibilityState,
          previousCommercial: prev.commercial,
          // History records RESTORED when that was requested; stored row is ACTIVE/TRIAL
          newCommercial: restorationRequested ? 'RESTORED' : saved.commercialStatus,
          actorUserId,
          reason: patch.reason ?? null,
          commercialRef: saved.commercialRef,
          result: 'success',
          detail: restorationRequested
            ? { storedCommercialStatus: saved.commercialStatus, event: 'RESTORATION' }
            : null,
        }),
      );

      return saved;
    });
  }

  async setProductPolicy(
    moduleKey: string,
    patch: {
      accessState?: AccessState;
      visibilityState?: VisibilityState;
      reason?: string;
    },
    actorUserId: number,
  ) {
    const mod = await this.registryRepo.findOne({ where: { moduleKey } });
    if (!mod) throw new NotFoundException(`Module "${moduleKey}" not found`);
    if (!mod.isIndependentlyControllable) {
      throw new BadRequestException(`Module "${moduleKey}" cannot be product-suspended independently.`);
    }

    return this.dataSource.transaction(async (em) => {
      let row = await em.findOne(ProductModulePolicy, {
        where: { productCode: this.productCode, moduleKey },
      });
      const prev = row
        ? { access: row.accessState, visibility: row.visibilityState }
        : { access: mod.defaultAccessState, visibility: mod.defaultVisibility };

      if (!row) {
        row = em.create(ProductModulePolicy, {
          productCode: this.productCode,
          moduleKey,
          accessState: patch.accessState ?? (mod.defaultAccessState as AccessState),
          visibilityState: patch.visibilityState ?? (mod.defaultVisibility as VisibilityState),
        });
      }
      if (patch.accessState) row.accessState = patch.accessState;
      if (patch.visibilityState) row.visibilityState = patch.visibilityState;
      if (patch.reason !== undefined) row.reason = patch.reason ?? null;
      row.updatedById = actorUserId;

      const saved = await em.save(ProductModulePolicy, row);

      await em.save(
        ModuleAccessHistory,
        em.create(ModuleAccessHistory, {
          productCode: this.productCode,
          tenantId: null,
          moduleKey,
          scope: 'product',
          previousAccessState: prev.access,
          newAccessState: saved.accessState,
          previousVisibility: prev.visibility,
          newVisibility: saved.visibilityState,
          actorUserId,
          reason: patch.reason ?? null,
          result: 'success',
          detail: { warning: 'Product-wide policy affects all tenants' },
        }),
      );

      return saved;
    });
  }

  async getHistory(filters: {
    tenantId?: number;
    moduleKey?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const qb = this.historyRepo.createQueryBuilder('h').orderBy('h.created_at', 'DESC');
    if (filters.tenantId) qb.andWhere('h.tenant_id = :tenantId', { tenantId: filters.tenantId });
    if (filters.moduleKey) qb.andWhere('h.module_key = :moduleKey', { moduleKey: filters.moduleKey });
    qb.skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total, page, limit };
  }

  private async assertSafeToDisable(tenantId: number, moduleKey: string) {
    const hardDependents: { moduleKey: string }[] = await this.dataSource.query(
      `SELECT module_key AS "moduleKey"
         FROM module_dependencies
        WHERE depends_on_key = $1 AND dependency_type = 'hard'`,
      [moduleKey],
    );
    for (const d of hardDependents) {
      const eff = await this.getEffectiveState(tenantId, d.moduleKey);
      if (eff.accessState === 'ENABLED') {
        throw new ConflictException(
          `Cannot disable "${moduleKey}" while hard-dependent module "${d.moduleKey}" is still ENABLED for this tenant. Disable dependents first.`,
        );
      }
    }
  }
}

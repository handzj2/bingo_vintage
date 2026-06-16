// Option A: fully tenant-aware settings service
// 2026-06-16: tenantId threaded through all read/write paths
import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  // Per-tenant cache: Map<`${tenantId}:${key}` | `global:${key}`, string>
  private readonly cache = new Map<string, string>();
  private cacheLoaded    = false;

  constructor(
    @InjectRepository(AppSetting)
    private readonly repo: Repository<AppSetting>,
  ) {}

  // ── Boot ────────────────────────────────────────────────────────────────────
  // onModuleInit no longer seeds defaults — migration 021 handles that.
  // We still warm the cache so the first request is fast.
  async onModuleInit() {
    await this.loadCache();
  }

  private async loadCache() {
    const all = await this.repo.find();
    this.cache.clear();
    for (const s of all) {
      const k = s.tenantId != null ? `${s.tenantId}:${s.key}` : `global:${s.key}`;
      this.cache.set(k, s.value);
    }
    this.cacheLoaded = true;
  }

  private cacheKey(key: string, tenantId?: number | null): string {
    return tenantId != null ? `${tenantId}:${key}` : `global:${key}`;
  }


  // ── Read API ─────────────────────────────────────────────────────────────────
  /**
   * getForTenant(key, tenantId)
   *
   * Resolution order:
   *   1. Tenant-specific row   (tenant_id = tenantId)
   *   2. Global fallback row   (tenant_id IS NULL)
   *   3. null
   *
   * This means a tenant can override any global setting, but if they haven't,
   * the platform default applies automatically.
   */
  async getForTenant(key: string, tenantId: number): Promise<string | null> {
    if (!this.cacheLoaded) await this.loadCache();

    // Check tenant-specific first
    const tenantVal = this.cache.get(`${tenantId}:${key}`);
    if (tenantVal !== undefined) return tenantVal;

    // Fall back to global
    const globalVal = this.cache.get(`global:${key}`);
    return globalVal ?? null;
  }

  async getNumberForTenant(key: string, tenantId: number, defaultValue: number): Promise<number> {
    const value = await this.getForTenant(key, tenantId);
    return value ? parseFloat(value) : defaultValue;
  }

  // ── Legacy global API — kept for SMS and other platform-level settings ───────
  async getSetting(key: string): Promise<string | null> {
    if (!this.cacheLoaded) await this.loadCache();
    // Check global first, then any tenant (for backwards compat)
    return this.cache.get(`global:${key}`) ?? null;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key);
    return value ? parseFloat(value) : defaultValue;
  }

  // ── Read for controller ───────────────────────────────────────────────────────
  async getAllForTenant(tenantId: number | null): Promise<AppSetting[]> {
    // Returns tenant-specific rows merged with global defaults
    const [tenantRows, globalRows] = await Promise.all([
      tenantId != null ? this.repo.find({ where: { tenantId } }) : Promise.resolve([]),
      this.repo.find({ where: { tenantId: IsNull() } }),
    ]);
    // Tenant rows override global rows by key
    const map = new Map<string, AppSetting>();
    for (const r of globalRows)  map.set(r.key, r);
    for (const r of tenantRows)  map.set(r.key, r);  // overrides
    return Array.from(map.values());
  }

  // ── Write API ─────────────────────────────────────────────────────────────────
  async updateForTenant(key: string, value: string, tenantId: number): Promise<AppSetting> {
    // Find tenant-specific row first
    let setting = await this.repo.findOne({ where: { key, tenantId } });

    if (!setting) {
      // Create a tenant-specific override (doesn't touch global row)
      setting = this.repo.create({ key, value, tenantId });
    } else {
      setting.value = value;
    }

    const saved = await this.repo.save(setting);
    this.cache.set(this.cacheKey(key, tenantId), value);
    return saved;
  }

  // Legacy global update — kept for admin use
  async updateSetting(key: string, value: string, tenantId?: number): Promise<AppSetting> {
    if (tenantId != null) return this.updateForTenant(key, value, tenantId);

    const setting = await this.repo.findOne({ where: { key, tenantId: IsNull() } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    setting.value = value;
    const saved = await this.repo.save(setting);
    this.cache.set(this.cacheKey(key, null), value);
    return saved;
  }

  // ── Seed for new tenants — called by superadmin.service.ts createTenant() ────
  async seedForTenant(tenantId: number): Promise<void> {
    const defaults = [
      { key: 'LOAN_INTEREST_RATE',       value: '0.15',  description: 'Annual interest rate (e.g. 0.15 for 15%)' },
      { key: 'LATE_FEE_DAILY',           value: '1000',  description: 'Daily penalty amount in UGX' },
      { key: 'loan.processing_fee',      value: '0',     description: 'Loan processing fee' },
      { key: 'loan.default_term_months', value: '12',    description: 'Default loan term in months' },
      { key: 'LOAN_LATE_FEE_RATE',       value: '0.05',  description: 'Annual late fee rate' },
    ];

    // Single upsert — avoids N sequential findOne+save round-trips
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(AppSetting)
      .values(defaults.map(d => ({ ...d, tenantId })))
      .orIgnore()   // ON CONFLICT DO NOTHING
      .execute();

    // Warm cache for this tenant's new settings
    for (const d of defaults) {
      if (!this.cache.has(this.cacheKey(d.key, tenantId))) {
        this.cache.set(this.cacheKey(d.key, tenantId), d.value);
      }
    }
  }
}

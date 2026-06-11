import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  // In-memory cache - loaded once on startup, invalidated on update
  private cache = new Map<string, string>();
  private cacheLoaded = false;

  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepo: Repository<AppSetting>,
  ) {}

  async onModuleInit() {
    // Seed defaults
    const defaults = [
      { key: 'LOAN_INTEREST_RATE', value: '0.15', description: 'Annual interest rate (e.g. 0.15 for 15%)' },
      { key: 'LATE_FEE_DAILY',     value: '1000',  description: 'Daily penalty amount in UGX' },
      { key: 'loan.processing_fee',    value: '0',  description: 'Loan processing fee' },
      { key: 'loan.default_term_months', value: '12', description: 'Default loan term in months' },
    ];

    for (const s of defaults) {
      const exists = await this.settingsRepo.findOne({ where: { key: s.key } });
      if (!exists) await this.settingsRepo.save(this.settingsRepo.create(s));
    }

    // Warm the cache once on startup
    await this.loadCache();
  }

  private async loadCache() {
    const all = await this.settingsRepo.find();
    this.cache.clear();
    for (const s of all) this.cache.set(s.key, s.value);
    this.cacheLoaded = true;
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return this.settingsRepo.find();
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.cacheLoaded) await this.loadCache();
    return this.cache.get(key) ?? null;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key);
    return value ? parseFloat(value) : defaultValue;
  }

  async updateSetting(key: string, value: string) {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    setting.value = value;
    setting.updatedAt = new Date();
    const saved = await this.settingsRepo.save(setting);
    // Invalidate cache entry immediately
    this.cache.set(key, value);
    return saved;
  }
}
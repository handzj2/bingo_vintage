import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepo: Repository<AppSetting>,
  ) {}

  // Initialize default settings if the DB is empty
  async onModuleInit() {
    const defaults = [
      { key: 'LOAN_INTEREST_RATE', value: '0.15', description: 'Annual interest rate (e.g. 0.15 for 15%)' },
      { key: 'LATE_FEE_DAILY', value: '1000', description: 'Daily penalty amount in UGX' },
    ];

    for (const setting of defaults) {
      const exists = await this.settingsRepo.findOne({ where: { key: setting.key } });
      if (!exists) {
        await this.settingsRepo.save(this.settingsRepo.create(setting));
      }
    }
  }

  // ✅ Added for SettingsController support
  async getAllSettings(): Promise<AppSetting[]> {
    return await this.settingsRepo.find();
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.getSetting(key);
    return value ? parseFloat(value) : defaultValue;
  }

  // ✅ Fixed line 43: Removed duplicate assignment and used correct property name
  async updateSetting(key: string, value: string) {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    
    setting.value = value;
    setting.updatedAt = new Date(); // Fixed here
    return await this.settingsRepo.save(setting);
  }
}
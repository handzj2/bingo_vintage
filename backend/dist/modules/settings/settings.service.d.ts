import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
export declare class SettingsService implements OnModuleInit {
    private readonly settingsRepo;
    constructor(settingsRepo: Repository<AppSetting>);
    onModuleInit(): Promise<void>;
    getAllSettings(): Promise<AppSetting[]>;
    getSetting(key: string): Promise<string | null>;
    getNumber(key: string, defaultValue: number): Promise<number>;
    updateSetting(key: string, value: string): Promise<AppSetting>;
}

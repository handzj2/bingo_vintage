import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getAll(): Promise<import("./entities/app-setting.entity").AppSetting[]>;
    update(key: string, value: string): Promise<import("./entities/app-setting.entity").AppSetting>;
}

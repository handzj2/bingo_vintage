import { SettingsService } from '../settings/settings.service';
export declare class SmsService {
    private settingsService;
    private readonly logger;
    constructor(settingsService: SettingsService);
    sendSms(phoneNumber: string, message: string): Promise<{
        success: boolean;
        status: string;
    }>;
}

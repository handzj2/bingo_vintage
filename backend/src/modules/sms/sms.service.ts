import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private settingsService: SettingsService) {}

  async sendSms(phoneNumber: string, message: string) {
    const isSmsEnabled = await this.settingsService.getSetting('ENABLE_SMS') === 'true';
    
    if (!isSmsEnabled) {
      this.logger.log(`SMS Disabled: Would have sent "${message}" to ${phoneNumber}`);
      return { success: true, status: 'skipped' };
    }

    try {
      // Integration logic for your SMS Gateway goes here
      this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);
      
      // Example: await this.gateway.send(phoneNumber, message);
      return { success: true, status: 'sent' };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}`, error.stack);
      return { success: false, status: 'failed' };
    }
  }
}
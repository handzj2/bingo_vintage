"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("../settings/settings.service");
let SmsService = SmsService_1 = class SmsService {
    constructor(settingsService) {
        this.settingsService = settingsService;
        this.logger = new common_1.Logger(SmsService_1.name);
    }
    async sendSms(phoneNumber, message) {
        const isSmsEnabled = await this.settingsService.getSetting('ENABLE_SMS') === 'true';
        if (!isSmsEnabled) {
            this.logger.log(`SMS Disabled: Would have sent "${message}" to ${phoneNumber}`);
            return { success: true, status: 'skipped' };
        }
        try {
            this.logger.log(`Sending SMS to ${phoneNumber}: ${message}`);
            return { success: true, status: 'sent' };
        }
        catch (error) {
            this.logger.error(`Failed to send SMS to ${phoneNumber}`, error.stack);
            return { success: false, status: 'failed' };
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SmsService);
//# sourceMappingURL=sms.service.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const app_setting_entity_1 = require("./entities/app-setting.entity");
let SettingsService = class SettingsService {
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
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
    async getAllSettings() {
        return await this.settingsRepo.find();
    }
    async getSetting(key) {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        return setting ? setting.value : null;
    }
    async getNumber(key, defaultValue) {
        const value = await this.getSetting(key);
        return value ? parseFloat(value) : defaultValue;
    }
    async updateSetting(key, value) {
        const setting = await this.settingsRepo.findOne({ where: { key } });
        if (!setting) {
            throw new common_1.NotFoundException(`Setting with key "${key}" not found`);
        }
        setting.value = value;
        setting.updatedAt = new Date();
        return await this.settingsRepo.save(setting);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(app_setting_entity_1.AppSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map
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
exports.BikesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bike_entity_1 = require("./entities/bike.entity");
let BikesService = class BikesService {
    constructor(bikeRepo) {
        this.bikeRepo = bikeRepo;
    }
    async findAll() {
        return await this.bikeRepo.find({ order: { created_at: 'DESC' } });
    }
    async findOne(id) {
        const bike = await this.bikeRepo.findOneBy({ id });
        if (!bike)
            throw new common_1.NotFoundException(`Bike with ID ${id} not found`);
        return bike;
    }
    async create(data) {
        const bike = this.bikeRepo.create(data);
        return await this.bikeRepo.save(bike);
    }
    async setMaintenance(id) {
        const bike = await this.findOne(id);
        if (bike.status === bike_entity_1.BikeStatus.LOANED) {
            throw new common_1.BadRequestException('Cannot set a loaned bike to maintenance');
        }
        bike.status = bike_entity_1.BikeStatus.MAINTENANCE;
        return await this.bikeRepo.save(bike);
    }
    async updateBikeStatus(id, status) {
        return await this.bikeRepo.update(id, { status });
    }
};
exports.BikesService = BikesService;
exports.BikesService = BikesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bike_entity_1.Bike)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BikesService);
//# sourceMappingURL=bikes.service.js.map
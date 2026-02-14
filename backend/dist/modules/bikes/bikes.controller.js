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
exports.BikesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bikes_service_1 = require("./bikes.service");
class CreateBikeDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Honda' }),
    __metadata("design:type", String)
], CreateBikeDto.prototype, "bike_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CG125' }),
    __metadata("design:type", String)
], CreateBikeDto.prototype, "model", void 0);
let BikesController = class BikesController {
    constructor(bikesService) {
        this.bikesService = bikesService;
    }
    async create(data) {
        return await this.bikesService.create(data);
    }
    async findAll() { return await this.bikesService.findAll(); }
};
exports.BikesController = BikesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBikeDto]),
    __metadata("design:returntype", Promise)
], BikesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BikesController.prototype, "findAll", null);
exports.BikesController = BikesController = __decorate([
    (0, swagger_1.ApiTags)('Bikes'),
    (0, common_1.Controller)('bikes'),
    __metadata("design:paramtypes", [bikes_service_1.BikesService])
], BikesController);
//# sourceMappingURL=bikes.controller.js.map
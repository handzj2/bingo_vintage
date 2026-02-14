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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bike = exports.BikeStatus = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("../../clients/entities/client.entity");
const loan_entity_1 = require("../../loans/entities/loan.entity");
var BikeStatus;
(function (BikeStatus) {
    BikeStatus["AVAILABLE"] = "AVAILABLE";
    BikeStatus["LOANED"] = "LOANED";
    BikeStatus["MAINTENANCE"] = "MAINTENANCE";
    BikeStatus["SOLD"] = "SOLD";
})(BikeStatus || (exports.BikeStatus = BikeStatus = {}));
let Bike = class Bike {
    get price() {
        return Number(this.sale_price);
    }
};
exports.Bike = Bike;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Bike.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Bike.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Bike.prototype, "frame_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Bike.prototype, "engine_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Bike.prototype, "registration_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Bike.prototype, "sale_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Bike.prototype, "purchase_price", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BikeStatus,
        default: BikeStatus.AVAILABLE
    }),
    __metadata("design:type", String)
], Bike.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'assigned_client_id' }),
    __metadata("design:type", Number)
], Bike.prototype, "assigned_client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_client_id' }),
    __metadata("design:type", client_entity_1.Client)
], Bike.prototype, "assignedClient", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => loan_entity_1.Loan, (loan) => loan.bike),
    __metadata("design:type", Array)
], Bike.prototype, "loans", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Bike.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Bike.prototype, "updated_at", void 0);
exports.Bike = Bike = __decorate([
    (0, typeorm_1.Entity)('bikes')
], Bike);
//# sourceMappingURL=bike.entity.js.map
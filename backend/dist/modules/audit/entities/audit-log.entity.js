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
exports.Audit = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
let Audit = class Audit {
};
exports.Audit = Audit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Audit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], Audit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_name', nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "tableName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'record_id', nullable: true }),
    __metadata("design:type", Number)
], Audit.prototype, "recordId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'old_values', nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "oldValues", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'new_values', nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "newValues", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Audit.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Audit.prototype, "createdAt", void 0);
exports.Audit = Audit = __decorate([
    (0, typeorm_1.Entity)('audit')
], Audit);
//# sourceMappingURL=audit-log.entity.js.map
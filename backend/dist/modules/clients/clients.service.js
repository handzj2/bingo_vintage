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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
let ClientsService = class ClientsService {
    constructor(clientRepo) {
        this.clientRepo = clientRepo;
    }
    async registerRider(clientData) {
        const duplicateChecks = [];
        if (clientData.nin) {
            duplicateChecks.push({ nin: clientData.nin });
        }
        if (clientData.phone) {
            duplicateChecks.push({ phone: clientData.phone });
        }
        if (clientData.email) {
            duplicateChecks.push({ email: clientData.email });
        }
        if (clientData.idNumber) {
            duplicateChecks.push({ idNumber: clientData.idNumber });
        }
        if (duplicateChecks.length > 0) {
            const existing = await this.clientRepo.findOne({
                where: duplicateChecks
            });
            if (existing) {
                if (existing.nin === clientData.nin) {
                    throw new common_1.ConflictException(`Client with NIN ${clientData.nin} already exists`);
                }
                if (existing.phone === clientData.phone) {
                    throw new common_1.ConflictException(`Client with phone ${clientData.phone} already exists`);
                }
                if (existing.email === clientData.email) {
                    throw new common_1.ConflictException(`Client with email ${clientData.email} already exists`);
                }
                if (existing.idNumber === clientData.idNumber) {
                    throw new common_1.ConflictException(`Client with ID Number ${clientData.idNumber} already exists`);
                }
            }
        }
        const newClient = this.clientRepo.create(clientData);
        return await this.clientRepo.save(newClient);
    }
    async getAllRiders() {
        return await this.clientRepo.find({ order: { id: 'DESC' } });
    }
    async findOne(id) {
        const client = await this.clientRepo.findOne({ where: { id } });
        if (!client)
            throw new common_1.NotFoundException(`Client with ID ${id} not found`);
        return client;
    }
    async getRiderById(id) {
        const client = await this.clientRepo.findOne({
            where: { id },
            relations: ['loans'],
        });
        if (!client) {
            throw new common_1.NotFoundException(`Rider with ID ${id} not found`);
        }
        return client;
    }
    async update(id, updateData) {
        const client = await this.findOne(id);
        if (updateData.nin && updateData.nin !== client.nin) {
            const existingWithNIN = await this.clientRepo.findOne({
                where: { nin: updateData.nin }
            });
            if (existingWithNIN) {
                throw new common_1.ConflictException(`Another client with NIN ${updateData.nin} already exists`);
            }
        }
        if (updateData.email && updateData.email !== client.email) {
            const existingWithEmail = await this.clientRepo.findOne({
                where: { email: updateData.email }
            });
            if (existingWithEmail) {
                throw new common_1.ConflictException(`Another client with email ${updateData.email} already exists`);
            }
        }
        if (updateData.idNumber && updateData.idNumber !== client.idNumber) {
            const existingWithIdNumber = await this.clientRepo.findOne({
                where: { idNumber: updateData.idNumber }
            });
            if (existingWithIdNumber) {
                throw new common_1.ConflictException(`Another client with ID Number ${updateData.idNumber} already exists`);
            }
        }
        if (updateData.phone && updateData.phone !== client.phone) {
            const existingWithPhone = await this.clientRepo.findOne({
                where: { phone: updateData.phone }
            });
            if (existingWithPhone) {
                throw new common_1.ConflictException(`Another client with phone ${updateData.phone} already exists`);
            }
        }
        Object.assign(client, updateData);
        return await this.clientRepo.save(client);
    }
    async delete(id) {
        const result = await this.clientRepo.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Rider with ID ${id} not found`);
        }
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ClientsService);
//# sourceMappingURL=clients.service.js.map
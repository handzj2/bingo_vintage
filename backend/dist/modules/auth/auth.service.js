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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepository, jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        console.log('Registering user:', dto.username);
        if (!dto.password || dto.password.length < 6) {
            throw new common_1.BadRequestException('Password must be at least 6 characters');
        }
        const existingUser = await this.userRepository.findOne({
            where: [
                { email: dto.email },
                { username: dto.username }
            ]
        });
        if (existingUser) {
            throw new common_1.ConflictException('Username or Email already exists');
        }
        const user = new user_entity_1.User();
        user.username = dto.username;
        user.email = dto.email;
        user.fullName = dto.full_name;
        user.role = dto.role || user_entity_1.UserRole.CASHIER;
        user.isActive = true;
        user.password_hash = dto.password;
        console.log('User before save:', JSON.stringify(user, null, 2));
        console.log('Has passwordInternal?', user.passwordInternal);
        console.log('Has password_hash getter?', user.password_hash);
        console.log('User object keys:', Object.keys(user));
        try {
            const savedUser = await this.userRepository.save(user);
            console.log('User saved successfully:', savedUser.id);
            console.log('Saved user structure:', JSON.stringify(savedUser, null, 2));
            const payload = {
                sub: savedUser.id,
                username: savedUser.username,
                email: savedUser.email,
                role: savedUser.role,
            };
            const { passwordInternal, ...userWithoutPassword } = savedUser;
            console.log('Returning user without password');
            return {
                user: userWithoutPassword,
                access_token: this.jwtService.sign(payload),
            };
        }
        catch (error) {
            console.error('Save error:', error.message);
            console.error('Full error:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    async login(dto) {
        const user = await this.userRepository.findOne({
            where: [
                { username: dto.username },
                { email: dto.username }
            ]
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await user.verifyPassword(dto.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        const payload = {
            sub: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                fullName: user.fullName,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
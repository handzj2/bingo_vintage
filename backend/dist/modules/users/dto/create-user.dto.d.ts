import { UserRole } from '../entities/user.entity';
export declare class CreateUserDto {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
}

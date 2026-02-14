import { UserRole } from '../../users/entities/user.entity';
export declare class RegisterDto {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
}
export declare class LoginDto {
    username: string;
    password: string;
}

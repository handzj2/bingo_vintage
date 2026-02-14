export declare enum UserRole {
    ADMIN = "admin",
    MANAGER = "manager",
    AGENT = "agent",
    CASHIER = "cashier"
}
export declare class User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    verifyPassword(password: string): Promise<boolean>;
    hashPassword(): Promise<void>;
}

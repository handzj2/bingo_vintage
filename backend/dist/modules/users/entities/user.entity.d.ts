export declare enum UserRole {
    ADMIN = "admin",
    MANAGER = "manager",
    CASHIER = "cashier",
    AGENT = "agent",
    USER = "user"
}
export declare enum SyncStatus {
    PENDING = "pending",
    SYNCED = "synced",
    FAILED = "failed"
}
export declare class User {
    id: number;
    username: string;
    private passwordInternal;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    syncStatus: SyncStatus;
    lastLogin: Date;
    createdAt: Date;
    updatedAt: Date;
    set password_hash(value: string);
    get password_hash(): string;
    get password(): string;
    hashPassword(): Promise<void>;
    verifyPassword(plainPassword: string): Promise<boolean>;
}

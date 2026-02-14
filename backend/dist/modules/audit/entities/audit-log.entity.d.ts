export declare class Audit {
    id: number;
    action: string;
    tableName: string;
    recordId: number;
    oldValues: string;
    newValues: string;
    user: string;
    ipAddress: string;
    description: string;
    createdAt: Date;
}

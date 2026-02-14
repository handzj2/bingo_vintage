export declare class SupabaseService {
    private client;
    constructor();
    uploadDocument(file: Buffer, filename: string, clientId: string): Promise<{
        path: string;
        url: string;
        bucket: string;
    }>;
    deleteDocument(path: string): Promise<void>;
}

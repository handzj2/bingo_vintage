import { SyncService } from './sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    reconcile(): Promise<{
        message: string;
        processed: number;
        corrected: number;
    }>;
}

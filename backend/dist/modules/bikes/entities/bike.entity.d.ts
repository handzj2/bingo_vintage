import { Client } from '../../clients/entities/client.entity';
import { Loan } from '../../loans/entities/loan.entity';
export declare enum BikeStatus {
    AVAILABLE = "AVAILABLE",
    LOANED = "LOANED",
    MAINTENANCE = "MAINTENANCE",
    SOLD = "SOLD"
}
export declare class Bike {
    id: number;
    model: string;
    frame_number: string;
    engine_number: string;
    registration_number: string;
    sale_price: number;
    purchase_price: number;
    status: BikeStatus;
    assigned_client_id: number;
    assignedClient: Client;
    loans: Loan[];
    created_at: Date;
    updated_at: Date;
    get price(): number;
}

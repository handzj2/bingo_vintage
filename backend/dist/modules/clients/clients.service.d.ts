import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
export declare class ClientsService {
    private clientRepo;
    constructor(clientRepo: Repository<Client>);
    registerRider(clientData: any): Promise<Client[]>;
    getAllRiders(): Promise<Client[]>;
    findOne(id: number): Promise<Client>;
    getRiderById(id: number): Promise<Client>;
    update(id: number, updateData: any): Promise<Client>;
    delete(id: number): Promise<void>;
}

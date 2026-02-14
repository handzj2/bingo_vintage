import { Repository } from 'typeorm';
import { Bike, BikeStatus } from './entities/bike.entity';
export declare class BikesService {
    private bikeRepo;
    constructor(bikeRepo: Repository<Bike>);
    findAll(): Promise<Bike[]>;
    findOne(id: number): Promise<Bike>;
    create(data: Partial<Bike>): Promise<Bike>;
    setMaintenance(id: number): Promise<Bike>;
    updateBikeStatus(id: number, status: BikeStatus): Promise<import("typeorm").UpdateResult>;
}

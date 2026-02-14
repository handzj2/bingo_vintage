import { BikesService } from './bikes.service';
declare class CreateBikeDto {
    bike_name: string;
    model: string;
}
export declare class BikesController {
    private readonly bikesService;
    constructor(bikesService: BikesService);
    create(data: CreateBikeDto): Promise<import("./entities/bike.entity").Bike>;
    findAll(): Promise<import("./entities/bike.entity").Bike[]>;
}
export {};

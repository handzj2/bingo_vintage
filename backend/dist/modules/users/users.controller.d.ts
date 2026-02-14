import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<import("./entities/user.entity").User>;
    findAll(): Promise<import("./entities/user.entity").User[]>;
    getStats(): Promise<any>;
    findOne(id: string): Promise<import("./entities/user.entity").User>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<import("./entities/user.entity").User>;
    changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<import("./entities/user.entity").User>;
    deactivate(id: string): Promise<import("./entities/user.entity").User>;
    activate(id: string): Promise<import("./entities/user.entity").User>;
    remove(id: string): Promise<void>;
}

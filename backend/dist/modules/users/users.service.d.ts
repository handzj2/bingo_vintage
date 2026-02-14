import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(): Promise<User[]>;
    findOne(id: number): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    update(id: number, updateUserDto: UpdateUserDto): Promise<User>;
    changePassword(id: number, changePasswordDto: ChangePasswordDto): Promise<User>;
    deactivate(id: number): Promise<User>;
    activate(id: number): Promise<User>;
    remove(id: number): Promise<void>;
    getStats(): Promise<any>;
    validateUser(email: string, password: string): Promise<User | null>;
}

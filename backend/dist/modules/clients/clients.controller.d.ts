import { ClientsService } from './clients.service';
export interface ClientFormModel {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    nin: string;
    date_of_birth: string;
    gender: string;
    marital_status: string;
    occupation: string;
    monthly_income: number;
    employment_status: string;
    address: {
        street: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    employment: {
        employer_name: string;
        employer_phone: string;
        employment_type: string;
        years_employed: number;
        monthly_income: number;
    };
    business: {
        name: string;
        type: string;
        address: string;
    };
    kin: {
        name: string;
        phone: string;
        relationship: string;
        address: string;
    };
    bank_details: {
        bank_name: string;
        account_number: string;
        account_name: string;
        branch: string;
    };
    justification: string;
    alt_phone: string;
    reference1_name: string;
    reference1_phone: string;
    reference2_name: string;
    reference2_phone: string;
}
export declare class AddressDto {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}
export declare class EmploymentDto {
    employer_name?: string;
    employer_phone?: string;
    employment_type?: string;
    years_employed?: number;
    monthly_income?: number;
}
export declare class BusinessDto {
    name?: string;
    type?: string;
    address?: string;
}
export declare class KinDto {
    name?: string;
    phone?: string;
    relationship?: string;
    address?: string;
}
export declare class BankDetailsDto {
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    branch?: string;
}
export declare class ClientFormModelDto {
    id?: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    email?: string;
    nin: string;
    date_of_birth?: string;
    gender?: string;
    marital_status?: string;
    occupation?: string;
    monthly_income?: number;
    employment_status?: string;
    address?: AddressDto;
    employment?: EmploymentDto;
    business?: BusinessDto;
    kin?: KinDto;
    bank_details?: BankDetailsDto;
    justification?: string;
    alt_phone?: string;
    reference1_name?: string;
    reference1_phone?: string;
    reference2_name?: string;
    reference2_phone?: string;
}
export declare class RegisterFullClientDto {
    fullName: string;
    phone: string;
    ninNumber: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    occupation?: string;
    employment_status?: string;
    monthly_income?: number;
    nationality?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    idNumber?: string;
    bank_name?: string;
    account_number?: string;
    bank_branch?: string;
    taxID?: string;
    creditScore?: number;
    loanLimit?: number;
    next_of_kin_name?: string;
    next_of_kin_phone?: string;
    next_of_kin_relationship?: string;
    business_name?: string;
    business_type?: string;
    business_address?: string;
    accountBalance?: number;
    sync_status?: string;
    status?: string;
    verified?: boolean;
    verificationMethod?: string;
    notes?: string;
}
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    create(clientData: RegisterFullClientDto): Promise<import("./entities/client.entity").Client[]>;
    createWithForm(clientData: ClientFormModelDto): Promise<import("./entities/client.entity").Client[]>;
    findAll(): Promise<import("./entities/client.entity").Client[]>;
    findOne(id: number): Promise<import("./entities/client.entity").Client>;
    update(id: number, updateData: Partial<RegisterFullClientDto>): Promise<import("./entities/client.entity").Client>;
    remove(id: number): Promise<void>;
    private transformClientData;
    private transformFormClientData;
}

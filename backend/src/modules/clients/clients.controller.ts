import { Controller, Get, Post, Body, Param, ParseIntPipe, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiParam } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsDateString, IsNotEmpty, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientsService } from './clients.service';

// Interface for the new structure
export interface ClientFormModel {
  // System ID
  id: string;

  // Basic identity
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

  // Address folder
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };

  // Employment folder
  employment: {
    employer_name: string;
    employer_phone: string;
    employment_type: string;
    years_employed: number;
    monthly_income: number;
  };

  // Business folder
  business: {
    name: string;
    type: string;
    address: string;
  };

  // Next of kin folder
  kin: {
    name: string;
    phone: string;
    relationship: string;
    address: string;
  };

  // Bank folder
  bank_details: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch: string;
  };

  // Policy & Additional
  justification: string;
  alt_phone: string;
  reference1_name: string;
  reference1_phone: string;
  reference2_name: string;
  reference2_phone: string;
}

// Option 1: Create new DTO classes that match the interface structure
export class AddressDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  street?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  postal_code?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  country?: string;
}

export class EmploymentDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  employer_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  employer_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  employment_type?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  years_employed?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  monthly_income?: number;
}

export class BusinessDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  address?: string;
}

export class KinDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  relationship?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  address?: string;
}

export class BankDetailsDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  bank_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  account_number?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  account_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  branch?: string;
}

// Option 2: New DTO that matches ClientFormModel interface
export class ClientFormModelDto {
  // System ID
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  id?: string;

  // Basic identity
  @ApiProperty({ example: 'Byaruhanga Moses' })
  @IsString() @IsNotEmpty()
  full_name: string;

  @ApiProperty({ required: false, example: 'Moses' })
  @IsOptional() @IsString()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Byaruhanga' })
  @IsOptional() @IsString()
  last_name?: string;

  @ApiProperty({ example: '+256701234567' })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty({ example: 'CM900123456789' })
  @IsString() @IsNotEmpty()
  nin: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  date_of_birth?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  marital_status?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  occupation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  monthly_income?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  employment_status?: string;

  // Address folder
  @ApiProperty({ required: false })
  @IsOptional() @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  // Employment folder
  @ApiProperty({ required: false })
  @IsOptional() @ValidateNested()
  @Type(() => EmploymentDto)
  employment?: EmploymentDto;

  // Business folder
  @ApiProperty({ required: false })
  @IsOptional() @ValidateNested()
  @Type(() => BusinessDto)
  business?: BusinessDto;

  // Next of kin folder
  @ApiProperty({ required: false })
  @IsOptional() @ValidateNested()
  @Type(() => KinDto)
  kin?: KinDto;

  // Bank folder
  @ApiProperty({ required: false })
  @IsOptional() @ValidateNested()
  @Type(() => BankDetailsDto)
  bank_details?: BankDetailsDto;

  // Policy & Additional
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  justification?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  alt_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  reference1_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  reference1_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  reference2_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  reference2_phone?: string;
}

// Original DTO (kept for backward compatibility)
export class RegisterFullClientDto {
  @ApiProperty({ example: 'Byaruhanga Moses' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+256701234567' })
  @IsString() @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'CM900123456789' })
  @IsString() @IsNotEmpty()
  ninNumber: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  maritalStatus?: string;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  occupation?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  employment_status?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  monthly_income?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  nationality?: string;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  idNumber?: string;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  bank_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  account_number?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  bank_branch?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  taxID?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  creditScore?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  loanLimit?: number;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  next_of_kin_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  next_of_kin_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  next_of_kin_relationship?: string;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  business_name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  business_type?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  business_address?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  accountBalance?: number;
  
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  sync_status?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  verified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  verificationMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  notes?: string;
}

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Original endpoint
  @Post('register')
  @ApiOperation({ summary: 'Register a new rider with all KYC fields' })
  async create(@Body() clientData: RegisterFullClientDto) {
    const transformedData = this.transformClientData(clientData);
    return await this.clientsService.registerRider(transformedData);
  }

  // New endpoint for ClientFormModel structure
  @Post('register-form')
  @ApiOperation({ summary: 'Register a new rider using form model structure' })
  async createWithForm(@Body() clientData: ClientFormModelDto) {
    const transformedData = this.transformFormClientData(clientData);
    return await this.clientsService.registerRider(transformedData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients/riders' })
  async findAll() {
    return await this.clientsService.getAllRiders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific client by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Client ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.clientsService.getRiderById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Client ID' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<RegisterFullClientDto>) {
    const transformedData = this.transformClientData(updateData);
    return await this.clientsService.update(id, transformedData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Client ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.clientsService.delete(id);
  }

  /**
   * Helper to map CSV/Swagger fields to Entity properties
   * Original transformation for backward compatibility
   */
  private transformClientData(data: Partial<RegisterFullClientDto>): any {
    // Remove snake_case properties that will be transformed
    const { 
      fullName,
      ninNumber,
      employment_status,
      monthly_income,
      bank_name,
      account_number,
      bank_branch,
      next_of_kin_name,
      next_of_kin_phone,
      next_of_kin_relationship,
      business_name,
      business_type,
      business_address,
      sync_status,
      ...rest 
    } = data;

    // Create the transformed object
    const transformed = {
      ...rest,
      // Map fullName to firstName and lastName
      ...(fullName && {
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || fullName.split(' ')[0],
      }),
      // Map other snake_case to camelCase
      ...(ninNumber && { nin: ninNumber }),
      ...(employment_status && { employmentStatus: employment_status }),
      ...(monthly_income !== undefined && { monthlyIncome: monthly_income }),
      ...(bank_name && { bankName: bank_name }),
      ...(account_number && { accountNumber: account_number }),
      ...(bank_branch && { bankBranch: bank_branch }),
      ...(next_of_kin_name && { nextOfKinName: next_of_kin_name }),
      ...(next_of_kin_phone && { nextOfKinPhone: next_of_kin_phone }),
      ...(next_of_kin_relationship && { nextOfKinRelationship: next_of_kin_relationship }),
      ...(business_name && { businessName: business_name }),
      ...(business_type && { businessType: business_type }),
      ...(business_address && { businessAddress: business_address }),
      ...(sync_status && { syncStatus: sync_status }),
    };

    return transformed;
  }

  /**
   * New transformation method for ClientFormModel structure
   */
  private transformFormClientData(data: Partial<ClientFormModelDto>): any {
    const result: any = { ...data };

    // Handle name fields
    if (data.full_name && (!data.first_name || !data.last_name)) {
      const nameParts = data.full_name.split(' ');
      result.firstName = nameParts[0];
      result.lastName = nameParts.slice(1).join(' ') || nameParts[0];
    } else {
      if (data.first_name) result.firstName = data.first_name;
      if (data.last_name) result.lastName = data.last_name;
    }

    // Remove fields that don't exist in entity
    delete result.full_name;
    delete result.first_name;
    delete result.last_name;

    // Map snake_case to camelCase for remaining basic fields
    if (data.date_of_birth) result.dateOfBirth = data.date_of_birth;
    if (data.marital_status) result.maritalStatus = data.marital_status;
    if (data.monthly_income !== undefined) result.monthlyIncome = data.monthly_income;
    if (data.employment_status) result.employmentStatus = data.employment_status;

    // Flatten address object
    if (data.address) {
      if (data.address.street) result.address = data.address.street;
      if (data.address.city) result.city = data.address.city;
      if (data.address.state) result.state = data.address.state;
      if (data.address.postal_code) result.postalCode = data.address.postal_code;
      if (data.address.country) result.country = data.address.country;
    }

    // Flatten employment object
    if (data.employment) {
      if (data.employment.employer_name) result.employerName = data.employment.employer_name;
      if (data.employment.employer_phone) result.employerPhone = data.employment.employer_phone;
      if (data.employment.employment_type) result.employmentType = data.employment.employment_type;
      if (data.employment.years_employed !== undefined) result.yearsEmployed = data.employment.years_employed;
      if (data.employment.monthly_income !== undefined) result.employmentMonthlyIncome = data.employment.monthly_income;
    }

    // Flatten business object
    if (data.business) {
      if (data.business.name) result.businessName = data.business.name;
      if (data.business.type) result.businessType = data.business.type;
      if (data.business.address) result.businessAddress = data.business.address;
    }

    // Flatten kin object
    if (data.kin) {
      if (data.kin.name) result.nextOfKinName = data.kin.name;
      if (data.kin.phone) result.nextOfKinPhone = data.kin.phone;
      if (data.kin.relationship) result.nextOfKinRelationship = data.kin.relationship;
      if (data.kin.address) result.nextOfKinAddress = data.kin.address;
    }

    // Flatten bank_details object
    if (data.bank_details) {
      if (data.bank_details.bank_name) result.bankName = data.bank_details.bank_name;
      if (data.bank_details.account_number) result.accountNumber = data.bank_details.account_number;
      if (data.bank_details.account_name) result.accountName = data.bank_details.account_name;
      if (data.bank_details.branch) result.bankBranch = data.bank_details.branch;
    }

    // Map policy fields
    if (data.justification) result.justification = data.justification;
    if (data.alt_phone) result.alternatePhone = data.alt_phone;
    if (data.reference1_name) result.reference1Name = data.reference1_name;
    if (data.reference1_phone) result.reference1Phone = data.reference1_phone;
    if (data.reference2_name) result.reference2Name = data.reference2_name;
    if (data.reference2_phone) result.reference2Phone = data.reference2_phone;

    return result;
  }
}
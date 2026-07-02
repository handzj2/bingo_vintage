import { IsString, IsEmail, MinLength, IsOptional, IsArray, ValidateNested, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class BranchDto {
  @IsString() name: string;
  @IsString() @IsOptional() location?: string;
}

export class TenantLoanProductDto {
  @IsString() name: string;
  @IsIn(['cash', 'bike']) productType: 'cash' | 'bike';
  @IsNumber() @IsOptional() interestRate?: number;
  @IsNumber() @IsOptional() minTermMonths?: number;
  @IsNumber() @IsOptional() maxTermMonths?: number;
  @IsNumber() @IsOptional() minAmount?: number;
  @IsNumber() @IsOptional() maxAmount?: number;
  @IsNumber() @IsOptional() processingFee?: number;
  @IsNumber() @IsOptional() lateFeeDaily?: number;
  @IsString() @IsOptional() description?: string;
}

export class CreateTenantDto {
  @IsString() name:           string;
  @IsString() slug:           string;
  @IsString() adminUsername:  string;
  @IsEmail()  adminEmail:     string;
  @IsString() @MinLength(8) adminPassword: string;
  @IsString() @IsOptional() description?:      string;
  @IsString() @IsOptional() contactEmail?:     string;
  @IsString() @IsOptional() contactPhone?:     string;
  // Branch onboarding
  @IsString() @IsOptional() branchName?:     string;  // default 'Main Branch'
  @IsString() @IsOptional() branchLocation?: string;
  @IsArray()  @IsOptional() @ValidateNested({ each: true }) @Type(() => BranchDto)
  additionalBranches?: BranchDto[];
  // Loan products this tenant offers. Defaults to a single Cash Loan with
  // the platform's standard settings if omitted — preserves the exact
  // implicit behavior every existing onboarding caller already gets.
  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => TenantLoanProductDto)
  loanProducts?: TenantLoanProductDto[];
}

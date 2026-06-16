import { IsString, IsEmail, MinLength, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BranchDto {
  @IsString() name: string;
  @IsString() @IsOptional() location?: string;
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
}

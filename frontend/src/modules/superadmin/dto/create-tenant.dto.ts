import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString() name:           string;
  @IsString() slug:           string;
  @IsString() adminUsername:  string;
  @IsEmail()  adminEmail:     string;
  @IsString() @MinLength(8) adminPassword: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() contactEmail?: string;
  @IsString() @IsOptional() contactPhone?: string;
}

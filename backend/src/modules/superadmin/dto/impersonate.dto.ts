import { IsNumber, IsString, IsOptional } from 'class-validator';

export class ImpersonateDto {
  @IsNumber()  userId:   number;
  @IsNumber()  tenantId: number;
  @IsString()  @IsOptional() reason?: string;
}

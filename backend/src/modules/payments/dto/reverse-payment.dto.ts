import { IsString, IsOptional } from 'class-validator';

export class ReversePaymentDto {
  @IsString()
  @IsOptional()
  reversal_reason?: string;
}
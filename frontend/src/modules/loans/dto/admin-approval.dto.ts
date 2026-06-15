import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminApprovalDto {
  @IsIn(['approve', 'reject'])
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
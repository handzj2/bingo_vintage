import { PartialType } from '@nestjs/mapped-types';
import { CreateLoanDto } from './create-loan.dto';
import { 
  IsOptional, 
  IsNumber, 
  IsDate, 
  IsString, 
  IsEnum,
  IsPositive 
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoanStatus } from '../entities/loan.entity';

export class UpdateLoanDto extends PartialType(CreateLoanDto) {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  balance?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  completed_at?: Date;

  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
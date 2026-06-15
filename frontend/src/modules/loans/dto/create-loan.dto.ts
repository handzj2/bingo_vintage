import {
  IsString, IsNumber, IsDate, IsEnum,
  IsOptional, IsPositive, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '../entities/loan.entity';
import { LoanType } from './loan-type.enum';

/**
 * PHASE 1 — CreateLoanDto
 * Fixed: clientId/bikeId now integer (was @IsUUID / string — broke FK inserts)
 */
export class CreateLoanDto {
  @ApiProperty({ example: 'LN-2026-0001' })
  @IsString()
  loan_number: string;

  @ApiProperty({ example: 1, description: 'Client integer ID' })
  @IsNumber()
  @IsPositive()
  clientId: number;

  @ApiProperty({ enum: LoanType, example: LoanType.CASH })
  @IsEnum(LoanType)
  loanType: LoanType;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bikeId?: number;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  principal_amount: number;

  @ApiProperty({ example: 0.15, description: 'Flat annual rate (decimal)' })
  @IsNumber()
  @Min(0)
  interest_rate: number;

  @ApiProperty({ example: 6750000 })
  @IsNumber()
  @IsPositive()
  total_amount: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @IsPositive()
  term_months: number;

  @ApiProperty({ required: false, example: 104 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  term_weeks?: number;

  @ApiProperty({ example: '2026-06-09' })
  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  end_date?: Date;

  @ApiProperty({ enum: LoanStatus, required: false })
  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;

  @ApiProperty({ required: false, example: 1500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiProperty({ required: false, example: 65000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weekly_installment?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

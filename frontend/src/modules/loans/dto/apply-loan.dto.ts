import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber, IsPositive, IsOptional, IsEnum, IsDate, IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoanType } from './loan-type.enum';

/**
 * PHASE 13 FIX — ApplyLoanDto
 * Added class-validator decorators so ValidationPipe (forbidNonWhitelisted)
 * does not reject clientId, amount, months, interestRate, loanType, start_date.
 */
export class ApplyLoanDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  clientId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bikeId?: number;

  @ApiProperty({ enum: LoanType, example: LoanType.CASH })
  @IsEnum(LoanType)
  loanType: LoanType;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @IsPositive()
  months: number;

  @ApiProperty({ example: 0.15, required: false })
  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @ApiProperty({ example: '2026-06-09', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  start_date?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

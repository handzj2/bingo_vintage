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

  // When supplied, the loan is created from this specific tenant-owned
  // LoanProduct row — its interestRate/termMonths/processingFee/lateFeeDaily
  // and calculationMethod become the authoritative source for this loan,
  // not the loanType/interestRate fields below. Optional and backward
  // compatible: omitting it falls through to the legacy loanType-driven
  // path unchanged.
  @ApiProperty({ example: 1, required: false, description: 'Tenant-owned LoanProduct id. When provided, this product is the authoritative source of loan behavior.' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  loanProductId?: number;

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

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CashLoanCalculateDto {
  @ApiProperty({ example: 5000000, description: 'Loan amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 12, description: 'Loan term in months' })
  @IsNumber()
  @Min(1)
  termMonths: number;

  @ApiProperty({ example: 0.15, description: 'Annual interest rate' })
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty({ example: '2024-01-01', description: 'Loan start date (optional)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;
}

import { 
  IsString, 
  IsNumber, 
  IsDate, 
  IsEnum, 
  IsOptional, 
  IsPositive,
  Min,
  IsUUID 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '../entities/loan.entity';

export class CreateLoanDto {
  @ApiProperty({ 
    example: 'LN-2024-001', 
    description: 'Unique loan number' 
  })
  @IsString()
  loan_number: string;

  @ApiProperty({ 
    example: '550e8400-e29b-41d4-a716-446655440000', 
    description: 'Client UUID' 
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({ 
    enum: ['cash', 'bike'], 
    example: 'bike',
    description: 'Type of loan' 
  })
  @IsEnum(['cash', 'bike'])
  loanType: string;

  @ApiProperty({ 
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Bike UUID (required for bike loans)' 
  })
  @IsOptional()
  @IsUUID()
  bikeId?: string;

  @ApiProperty({ 
    example: 10000000, 
    description: 'Principal loan amount' 
  })
  @IsNumber()
  @IsPositive()
  principal_amount: number;

  @ApiProperty({ 
    example: 0.1, 
    description: 'Annual interest rate (decimal)' 
  })
  @IsNumber()
  @Min(0)
  interest_rate: number;

  @ApiProperty({ 
    example: 12000000, 
    description: 'Total amount to be repaid (principal + interest)' 
  })
  @IsNumber()
  @IsPositive()
  total_amount: number;

  @ApiProperty({ 
    example: 12, 
    description: 'Loan term in months (for cash loans)' 
  })
  @IsNumber()
  @IsPositive()
  term_months: number;

  @ApiProperty({ 
    required: false,
    example: 104,
    description: 'Loan term in weeks (for bike loans)' 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  term_weeks?: number;

  @ApiProperty({ 
    example: '2024-01-01',
    description: 'Loan start date' 
  })
  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @ApiProperty({ 
    required: false,
    example: '2025-01-01',
    description: 'Loan end date (calculated if not provided)' 
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end_date?: Date;

  @ApiProperty({ 
    enum: LoanStatus,
    example: 'active',
    description: 'Initial loan status',
    required: false,
    default: 'active'
  })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;

  @ApiProperty({ 
    required: false,
    example: 3000000,
    description: 'Deposit amount (for bike loans)' 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiProperty({ 
    required: false,
    example: 500000,
    description: 'Weekly installment amount (for bike loans)' 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weekly_installment?: number;

  @ApiProperty({ 
    required: false,
    example: 1,
    description: 'Legacy bike ID (integer reference - use bikeId for UUID)' 
  })
  @IsNumber()
  @IsOptional()
  bike_id?: number;

  @ApiProperty({ 
    required: false,
    example: 'Loan for Honda CBR150R purchase',
    description: 'Additional notes or comments' 
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
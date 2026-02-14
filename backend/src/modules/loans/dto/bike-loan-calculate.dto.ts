import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsPositive } from 'class-validator';

export class BikeLoanCalculateDto {
  @ApiProperty({ 
    example: 9500000, 
    description: 'Bike sale price (shown to client)' 
  })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ 
    example: 500000, 
    description: 'Initial deposit paid by client' 
  })
  @IsNumber()
  @Min(0)
  deposit: number;

  @ApiProperty({ 
    example: 85000, 
    description: 'Weekly payment amount', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  weeklyInstallment?: number;

  @ApiProperty({ 
    example: 106, 
    description: 'Target number of weeks to pay', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetWeeks?: number;

  @ApiProperty({ 
    example: 6000000, 
    description: 'Admin only: actual cost price', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}
import {
  IsString, IsNumber, IsOptional, IsPositive,
  Matches, MaxLength, IsEnum, IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../modules/enums/payment-method.enum';

/**
 * PHASE 6 — CreatePaymentDto
 * Added: cash_drawer_id (optional FK), schedule_id (optional)
 * principal_amount / interest_amount deliberately excluded — service splits them
 */
export class CreatePaymentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  loan_id: number;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  payment_date?: string;
  @ApiProperty({ required: false, description: 'Required when admin posts a backdated payment_date' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  backdate_reason?: string;


  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9\-_]+$/, { message: 'Invalid receipt number format' })
  receipt_number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collected_by?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  schedule_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cash_drawer_id?: number;

  @ApiProperty({
    required: false,
    description:
      'Idempotency key — a UUID generated client-side to prevent duplicate payment submissions. ' +
      'If a payment with this key already exists, it is returned without creating a duplicate.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;
}

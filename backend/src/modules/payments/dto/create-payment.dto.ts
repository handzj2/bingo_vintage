import { 
  IsString, 
  IsNumber, 
  IsDate, 
  IsEnum, 
  IsOptional, 
  IsPositive 
} from 'class-validator';
import { Type } from 'class-transformer';
// Import from modules/enums, not from entity
import { PaymentMethod } from '../../enums/payment-method.enum';

export class CreatePaymentDto {
  @IsString()
  receipt_number: string;

  @IsNumber()
  loan_id: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsDate()
  @Type(() => Date)
  payment_date: Date;

  @IsString()
  @IsOptional()
  transaction_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  collected_by?: string;

  @IsNumber()
  @IsOptional()
  schedule_id?: number;
}
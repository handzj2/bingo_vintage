import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  categoryId: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  description: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsNumber()
  cashDrawerId?: number;
}
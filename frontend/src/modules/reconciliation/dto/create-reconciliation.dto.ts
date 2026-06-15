import { IsNumber, Min } from 'class-validator';

export class CreateReconciliationDto {
  @IsNumber()
  drawerId: number;

  @IsNumber()
  @Min(0)
  actualCash: number;
}
import { IsNumber, Min } from 'class-validator';

export class CloseDrawerDto {
  @IsNumber()
  @Min(0)
  actualCash: number;
}
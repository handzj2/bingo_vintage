import { IsNumber, Min } from 'class-validator';

export class OpenDrawerDto {
  @IsNumber()
  @Min(0)
  openingBalance: number;
}
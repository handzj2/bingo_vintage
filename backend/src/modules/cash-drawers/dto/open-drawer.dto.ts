import { IsNumber, Min, IsOptional, IsBoolean, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenDrawerDto {
  @ApiProperty({ example: 50000, description: 'Opening float / starting cash' })
  @IsNumber()
  @Min(0)
  openingBalance: number;

  /** Manager/admin override open when policy allows (e.g. after hours or special day) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOverride?: boolean;

  @ApiPropertyOptional({ description: 'Mandatory reason when isOverride=true' })
  @ValidateIf((o) => o.isOverride === true)
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}

import { IsNumber, Min, IsOptional, IsBoolean, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDrawerDto {
  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  actualCash: number;

  /** Required when closing after the drawer business day (Kampala). Manager/admin only. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceClose?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.forceClose === true)
  @IsString()
  @MaxLength(500)
  forceReason?: string;
}

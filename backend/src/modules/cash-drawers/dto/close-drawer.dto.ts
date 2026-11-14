import { IsNumber, Min, IsOptional, IsBoolean, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseDrawerDto {
  @ApiProperty({ example: 500000, description: 'Physically counted cash at close' })
  @IsNumber()
  @Min(0)
  actualCash: number;

  /** Required when closing after the drawer business day. Needs drawer.force_close. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceClose?: boolean;

  @ApiPropertyOptional({ description: 'Mandatory written reason for force-close' })
  @ValidateIf((o) => o.forceClose === true)
  @IsString()
  @MaxLength(500)
  forceReason?: string;

  /** Required when counted cash differs from expected balance */
  @ApiPropertyOptional({ description: 'Explanation for non-zero cash difference' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  discrepancyReason?: string;
}

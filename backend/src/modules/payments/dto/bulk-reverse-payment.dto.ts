import { IsArray, ArrayMinSize, ArrayMaxSize, IsInt, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Bulk reverse — admin only.
 * Reuses the existing single-payment reversePayment() engine for every ID.
 * Each payment is processed in its own transaction so one failure does not
 * roll back the others. Max 50 per request to keep the request reasonable.
 */
export class BulkReversePaymentDto {
  @ApiProperty({ type: [Number], description: 'Payment IDs to reverse' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Type(() => Number)
  paymentIds: number[];

  @ApiProperty({ description: 'Single reason applied to every reversal (audit)' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}

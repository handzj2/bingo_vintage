import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { Payment } from '../payments/entities/payment.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    AuditModule,   // provides AuditService for RECEIPT_PRINTED logging
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],  // exported so PaymentsModule can call uniqueReceiptNumber()
})
export class ReceiptsModule {}

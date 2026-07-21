/**
 * PaymentsModule
 *
 * Change from uploaded version:
 *   • Imports ReceiptsModule so PaymentsService can inject ReceiptsService
 *     for collision-proof receipt number generation.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity'; // ← NEW
import { Loan } from '../loans/entities/loan.entity';
import { LoanSchedule } from '../schedules/entities/schedule.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SmsModule } from '../sms/sms.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ReceiptsModule } from '../receipts/receipts.module';   // ← NEW
import { CashDrawersModule } from '../cash-drawers/cash-drawers.module'; // Phase 3: FK validation
import { PaymentAllocationService } from './services/payment-allocation.service'; // ← NEW: was dead code, now wired in

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAllocation, Loan, LoanSchedule]),
    AuthModule,
    AuditModule,
    SmsModule,
    LedgerModule,
    ReceiptsModule,   // provides ReceiptsService.uniqueReceiptNumber()
    CashDrawersModule, // provides CashDrawerService.findOne() for FK guard
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentAllocationService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
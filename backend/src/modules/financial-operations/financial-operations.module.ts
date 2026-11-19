import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinTransaction } from './entities/fin-transaction.entity';
import { ClientDeposit } from './entities/client-deposit.entity';
import { DepositAllocation } from './entities/deposit-allocation.entity';
import { FieldCollection } from './entities/field-collection.entity';
import { RemittanceBatch } from './entities/remittance-batch.entity';
import { FinCategory } from './entities/fin-category.entity';
import { FinAccount } from '../finance-core/entities/fin-account.entity';
import { FinancialOperationsService } from './financial-operations.service';
import { FinancialOperationsController } from './financial-operations.controller';
import { CashDrawersModule } from '../cash-drawers/cash-drawers.module';
import { FinanceCoreModule } from '../finance-core/finance-core.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinTransaction,
      ClientDeposit,
      DepositAllocation,
      FieldCollection,
      RemittanceBatch,
      FinCategory,
      FinAccount,
    ]),
    CashDrawersModule,
    FinanceCoreModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [FinancialOperationsService],
  controllers: [FinancialOperationsController],
  exports: [FinancialOperationsService],
})
export class FinancialOperationsModule {}

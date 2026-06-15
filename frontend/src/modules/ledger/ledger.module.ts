/**
 * LedgerModule
 *
 * Self-contained module for the financial ledger engine.
 * Import this in AppModule and in any module that needs LedgerService.
 *
 * Integration:
 *   1. Add to AppModule imports:
 *        import { LedgerModule } from './modules/ledger/ledger.module';
 *        ...
 *        imports: [ ..., LedgerModule ]
 *
 *   2. Import in LoansModule and PaymentsModule:
 *        import { LedgerModule } from '../ledger/ledger.module';
 *        imports: [ ..., LedgerModule ]
 *
 *   3. Then inject in LoansService / PaymentsService constructor:
 *        private readonly ledgerService: LedgerService
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerService } from './ledger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntry]),
  ],
  providers: [LedgerService],
  exports:   [LedgerService],   // <-- exported so LoansModule, PaymentsModule can use it
})
export class LedgerModule {}

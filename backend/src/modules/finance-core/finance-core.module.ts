import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinAccount } from './entities/fin-account.entity';
import { FinJournal } from './entities/fin-journal.entity';
import { FinJournalLine } from './entities/fin-journal-line.entity';
import { ApprovalPolicy } from './entities/approval-policy.entity';
import { JournalPosterService } from './journal-poster.service';
import { FinanceCoreController } from './finance-core.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinAccount, FinJournal, FinJournalLine, ApprovalPolicy]),
    AuditModule,
  ],
  controllers: [FinanceCoreController],
  providers: [JournalPosterService],
  exports: [JournalPosterService, TypeOrmModule],
})
export class FinanceCoreModule {}

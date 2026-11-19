import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/utils/numeric.transformer';
import { FinJournal } from './fin-journal.entity';
import { FinAccount } from './fin-account.entity';

@Entity('fin_journal_lines')
@Index(['journalId'])
@Index(['accountId'])
export class FinJournalLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'journal_id' })
  journalId: number;

  @ManyToOne(() => FinJournal, (j) => j.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journal_id' })
  journal: FinJournal;

  @Column({ name: 'account_id' })
  accountId: number;

  @ManyToOne(() => FinAccount)
  @JoinColumn({ name: 'account_id' })
  account: FinAccount;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  debit: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  credit: number;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ name: 'line_order', default: 0 })
  lineOrder: number;
}

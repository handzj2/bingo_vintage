import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Expense } from './expense.entity';

@Entity('expense_attachments')
export class ExpenseAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expense, { nullable: false, onDelete: 'CASCADE' })
  expense: Expense;

  @Column()
  expenseId: number;

  @Column()
  fileUrl: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('audit')
export class Audit { // ✅ Ensure this is 'Audit'
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @ApiProperty()
  action: string; // CREATE, UPDATE, DELETE, LOGIN, REVERSAL

  @Column({ name: 'table_name', nullable: true })
  tableName: string;

  @Column({ name: 'record_id', nullable: true })
  recordId: number;

  @Column({ type: 'text', name: 'old_values', nullable: true })
  oldValues: string; // JSON string of previous state

  @Column({ type: 'text', name: 'new_values', nullable: true })
  newValues: string; // JSON string of new state

  @Column({ nullable: true })
  user: string; // Admin who performed the action

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true }) // 👈 ADDED THIS LINE
  metadata: string; // Stores reversal reasons and governance data

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
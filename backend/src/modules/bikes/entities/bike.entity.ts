import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  OneToMany,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Loan } from '../../loans/entities/loan.entity';

export enum BikeStatus {
  AVAILABLE = 'AVAILABLE',
  LOANED = 'LOANED',
  MAINTENANCE = 'MAINTENANCE',
  SOLD = 'SOLD'
}

@Entity('bikes')
export class Bike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  model: string;

  @Column({ unique: true })
  frame_number: string;

  @Column({ unique: true, nullable: true })
  engine_number: string;

  @Column({ unique: true, nullable: true })
  registration_number: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  sale_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchase_price: number;

  @Column({ 
    type: 'enum', 
    enum: BikeStatus, 
    default: BikeStatus.AVAILABLE 
  })
  status: BikeStatus;

  // ⚡ "Bridge" field: Locks bike to a specific customer when loan is created
  @Column({ nullable: true, name: 'assigned_client_id' })
  assigned_client_id: number;

  // ⚡ OPTIONAL: Add relation to Client for easier access
  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'assigned_client_id' })
  assignedClient: Client;

  @OneToMany(() => Loan, (loan) => loan.bike)
  loans: Loan[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  get price(): number {
    return Number(this.sale_price);
  }
}
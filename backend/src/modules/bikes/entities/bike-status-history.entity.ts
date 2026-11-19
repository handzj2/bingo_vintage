import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Bike } from './bike.entity';

@Entity('bike_status_history')
@Index(['bikeId', 'createdAt'])
@Index(['tenantId', 'bikeId'])
export class BikeStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'bike_id' })
  bikeId: number;

  @ManyToOne(() => Bike)
  @JoinColumn({ name: 'bike_id' })
  bike: Bike;

  @Column({ name: 'from_status', length: 32, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', length: 32 })
  toStatus: string;

  @Column({ name: 'changed_by_id', nullable: true })
  changedById: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'reference_type', length: 64, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

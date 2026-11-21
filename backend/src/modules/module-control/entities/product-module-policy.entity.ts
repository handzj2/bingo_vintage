import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('product_module_policies')
export class ProductModulePolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_code', length: 60, default: 'bingo_vintage' })
  productCode: string;

  @Column({ name: 'module_key', length: 80 })
  moduleKey: string;

  @Column({ name: 'access_state', length: 20, default: 'ENABLED' })
  accessState: string;

  @Column({ name: 'visibility_state', length: 20, default: 'VISIBLE' })
  visibilityState: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'updated_by_id', nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

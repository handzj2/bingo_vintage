import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  AGENT = 'agent',
  USER = 'user'
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ unique: true })
  @ApiProperty()
  username: string;

  // ✅ UPDATED: Map to 'password_hash' column in database
  @Column({ name: 'password_hash', nullable: false }) 
  @Exclude()
  private passwordInternal: string;

  @Column({ unique: true })
  @ApiProperty()
  email: string;

  @Column({ name: 'full_name', nullable: true })
  @ApiProperty()
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CASHIER
  })
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  @ApiProperty()
  isActive: boolean;

  @Column({ name: 'sync_status', default: SyncStatus.PENDING })
  @ApiProperty({ enum: SyncStatus })
  syncStatus: SyncStatus;

  @Column({ name: 'last_login', nullable: true })
  @ApiProperty()
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  @ApiProperty()
  updatedAt: Date;

  // ✅ Setter that AuthService will use
  set password_hash(value: string) {
    this.passwordInternal = value; // This will trigger @BeforeInsert to hash
  }
  
  get password_hash(): string {
    return this.passwordInternal;
  }

  get password(): string {
    return this.passwordInternal;
  }

  // Hash password automatically
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if passwordInternal exists and is not already hashed
    if (this.passwordInternal && !this.passwordInternal.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.passwordInternal = await bcrypt.hash(this.passwordInternal, salt);
    }
  }

  // Verify password
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordInternal);
  }
}
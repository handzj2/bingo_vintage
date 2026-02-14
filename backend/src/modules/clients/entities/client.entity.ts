import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Loan } from '../../loans/entities/loan.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ FUTURE-PROOF: Maps DB 'first_name' to code 'firstName'
  @Column({ name: 'first_name' })
  firstName: string;

  // ✅ FUTURE-PROOF: Maps DB 'last_name' to code 'lastName'
  @Column({ name: 'last_name' })
  lastName: string;

  // ⚡ ADDED: Virtual property to provide a full name getter
  get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'id_number', unique: true, nullable: true })
  idNumber: string;

  // New fields from CSV
  @Column({ name: 'nin', unique: true, nullable: true })
  nin: string; // National ID Number

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ name: 'employment_status', nullable: true })
  employmentStatus: string;

  @Column({ name: 'monthly_income', type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyIncome: number;

  @Column({ name: 'bank_name', nullable: true })
  bankName: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string;

  @Column({ name: 'bank_branch', nullable: true })
  bankBranch: string;

  @Column({ name: 'next_of_kin_name', nullable: true })
  nextOfKinName: string;

  @Column({ name: 'next_of_kin_phone', nullable: true })
  nextOfKinPhone: string;

  @Column({ name: 'next_of_kin_relationship', nullable: true })
  nextOfKinRelationship: string;

  @Column({ name: 'business_name', nullable: true })
  businessName: string;

  @Column({ name: 'business_type', nullable: true })
  businessType: string;

  @Column({ name: 'business_address', nullable: true })
  businessAddress: string;

  @Column({ name: 'sync_status', default: 'pending' })
  syncStatus: string;

  // Added missing KYC fields
  @Column({ name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ name: 'marital_status', nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ name: 'tax_id', nullable: true })
  taxID: string;

  @Column({ name: 'credit_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  creditScore: number;

  @Column({ name: 'loan_limit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  loanLimit: number;

  @Column({ name: 'account_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  accountBalance: number;

  @Column({ nullable: true })
  status: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'verification_method', nullable: true })
  verificationMethod: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => Loan, (loan) => loan.client)
  loans: Loan[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
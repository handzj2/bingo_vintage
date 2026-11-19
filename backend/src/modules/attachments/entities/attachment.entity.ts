import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Metadata only. Binary storage is private Supabase (D6).
 * Never expose private financial documents via public URLs.
 */
@Entity('attachments')
@Index(['tenantId', 'entityType', 'entityId'])
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number | null;

  @Column({ name: 'entity_type', length: 64 })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', length: 128 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  /** Private storage key / path inside the bucket. */
  @Column({ name: 'storage_key', length: 512 })
  storageKey: string;

  @Column({ name: 'storage_bucket', length: 128, default: 'bingo-private' })
  storageBucket: string;

  @Column({ name: 'uploaded_by_id', nullable: true })
  uploadedById: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';

/**
 * Metadata + storage-key management only.
 * Binary storage is private Supabase (D6). Never return a public URL.
 */
@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
  ) {}

  async register(params: {
    tenantId: number;
    branchId?: number | null;
    entityType: string;
    entityId: number;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    storageBucket?: string;
    uploadedById?: number | null;
    description?: string;
  }): Promise<Attachment> {
    if (!params.storageKey || params.storageKey.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(params.mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${params.mimeType}`);
    }
    if (params.sizeBytes > 15 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 15 MB limit');
    }

    const row = this.repo.create({
      tenantId: params.tenantId,
      branchId: params.branchId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageKey: params.storageKey,
      storageBucket: params.storageBucket || 'bingo-private',
      uploadedById: params.uploadedById ?? null,
      description: params.description ?? null,
    });
    return this.repo.save(row);
  }

  async listForEntity(tenantId: number, entityType: string, entityId: number): Promise<Attachment[]> {
    return this.repo.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: number, tenantId: number): Promise<Attachment> {
    const row = await this.repo.findOne({ where: { id, tenantId } });
    if (!row) throw new ForbiddenException('Attachment not found or outside tenant');
    return row;
  }
}

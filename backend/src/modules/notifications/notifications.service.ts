import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(params: {
    tenantId: number;
    userId: number;
    branchId?: number | null;
    type: string;
    title: string;
    body?: string;
    linkPath?: string;
    entityType?: string;
    entityId?: number;
  }): Promise<Notification> {
    const n = this.repo.create({
      tenantId: params.tenantId,
      userId: params.userId,
      branchId: params.branchId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      linkPath: params.linkPath ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      isRead: false,
    });
    return this.repo.save(n);
  }

  async pendingCount(tenantId: number, userId: number): Promise<number> {
    return this.repo.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  async listForUser(tenantId: number, userId: number, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(id: number, tenantId: number, userId: number): Promise<void> {
    await this.repo.update(
      { id, tenantId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(tenantId: number, userId: number): Promise<void> {
    await this.repo.update(
      { tenantId, userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}

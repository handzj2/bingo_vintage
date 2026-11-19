import {
  Controller, Get, Patch, Param, ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../common/helpers/role-helper';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('pending-count')
  @ApiOperation({ summary: 'Unread notification count for current user' })
  async pendingCount(@Request() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId ?? req.user.id;
    const count = await this.service.pendingCount(tenantId, userId);
    return { count };
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  async list(@Request() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId ?? req.user.id;
    return this.service.listForUser(tenantId, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId ?? req.user.id;
    await this.service.markRead(id, tenantId, userId);
    return { ok: true };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Request() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId ?? req.user.id;
    await this.service.markAllRead(tenantId, userId);
    return { ok: true };
  }
}

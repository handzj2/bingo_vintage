import { Controller, Post, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SyncService } from './sync.service';
import { AuthRequest } from '../../common/helpers/role-helper';

@ApiTags('System Sync')
@ApiBearerAuth('JWT-auth')
@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('reconcile')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin-only: Reconcile loan balances for the caller\'s own tenant' })
  async reconcile(@Request() req: AuthRequest) {
    if (!req.user?.tenantId) {
      throw new ForbiddenException('No tenant assigned — cannot run reconciliation');
    }
    return await this.syncService.reconcileBalances(req.user.tenantId);
  }
}
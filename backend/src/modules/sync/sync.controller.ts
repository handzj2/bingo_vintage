import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SyncService } from './sync.service';
import { UserRole } from '../users/entities/user.entity'; // ✅ This import is correct
@ApiTags('System Sync')
@ApiBearerAuth('JWT-auth')
@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('reconcile')
@Roles('admin') // 🔐 Matches the string used in your database/guard
@ApiOperation({ summary: 'Admin-only: Reconcile loan balances' })
async reconcile() {
  return await this.syncService.reconcileBalances();
}
}
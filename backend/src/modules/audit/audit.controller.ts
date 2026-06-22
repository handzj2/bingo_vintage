import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertRole, AuthRequest } from '../../common/helpers/role-helper';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all system audit logs (Admin only)' })
  async findAll(@Request() req: AuthRequest) {
    assertRole(req.user, ['admin', 'manager', 'superadmin'], 'Admin or manager access required for audit logs');
    // Superadmin (tenantId null/undefined) sees every tenant's activity.
    // Regular tenant admin/manager only sees their own tenant's logs.
    const role = (req.user as any)?.roleName?.toLowerCase?.() || (req.user as any)?.role?.toLowerCase?.() || '';
    const tenantId = role === 'superadmin' ? undefined : req.user.tenantId;
    return await this.auditService.findAll(tenantId);
  }
}
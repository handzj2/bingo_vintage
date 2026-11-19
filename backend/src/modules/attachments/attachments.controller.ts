import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../common/helpers/role-helper';
import { AttachmentsService } from './attachments.service';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register attachment metadata after private upload' })
  async register(@Body() body: any, @Request() req: AuthRequest) {
    return this.service.register({
      tenantId: req.user.tenantId,
      branchId: body.branchId ?? req.user.branchId ?? null,
      entityType: body.entityType,
      entityId: body.entityId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageKey: body.storageKey,
      storageBucket: body.storageBucket,
      uploadedById: req.user.userId ?? req.user.id,
      description: body.description,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List attachments for an entity' })
  async list(
    @Query('entityType') entityType: string,
    @Query('entityId', ParseIntPipe) entityId: number,
    @Request() req: AuthRequest,
  ) {
    return this.service.listForEntity(req.user.tenantId, entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment metadata (no public URL)' })
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.getOne(id, req.user.tenantId);
  }
}

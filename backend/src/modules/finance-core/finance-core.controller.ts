import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest, assertAdmin } from '../../common/helpers/role-helper';
import { FinAccount } from './entities/fin-account.entity';
import { FinJournal, FinJournalType } from './entities/fin-journal.entity';
import { JournalPosterService, CreateJournalInput } from './journal-poster.service';

@ApiTags('Finance Core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceCoreController {
  constructor(
    @InjectRepository(FinAccount)
    private readonly accountRepo: Repository<FinAccount>,
    @InjectRepository(FinJournal)
    private readonly journalRepo: Repository<FinJournal>,
    private readonly poster: JournalPosterService,
  ) {}

  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts for current tenant' })
  async listAccounts(@Request() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    return this.accountRepo.find({
      where: { tenantId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  @Get('journals')
  @ApiOperation({ summary: 'List journals for current tenant' })
  async listJournals(
    @Request() req: AuthRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    const qb = this.journalRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.lines', 'lines')
      .where('j.tenant_id = :tenantId', { tenantId })
      .orderBy('j.created_at', 'DESC')
      .take(Math.min(Number(limit) || 50, 200));
    if (status) qb.andWhere('j.status = :status', { status });
    return qb.getMany();
  }

  @Get('journals/:id')
  @ApiOperation({ summary: 'Get one journal with lines' })
  async getJournal(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.journalRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
      relations: ['lines'],
    });
  }

  @Post('journals')
  @ApiOperation({ summary: 'Create a draft journal (must be balanced)' })
  async createJournal(@Body() body: any, @Request() req: AuthRequest) {
    // Admin-only for now (D5)
    assertAdmin(req.user, 'Admin required to create journals');
    const input: CreateJournalInput = {
      tenantId: req.user.tenantId,
      branchId: body.branchId ?? req.user.branchId ?? null,
      reference: body.reference,
      type: body.type || FinJournalType.OTHER,
      journalDate: body.journalDate || new Date().toISOString().slice(0, 10),
      description: body.description,
      idempotencyKey: body.idempotencyKey,
      sourceModule: body.sourceModule,
      sourceId: body.sourceId,
      createdById: req.user.userId ?? req.user.id,
      reason: body.reason,
      lines: body.lines || [],
    };
    return this.poster.createDraft(input);
  }

  @Post('journals/:id/post')
  @ApiOperation({ summary: 'Post an approved/draft journal (balance enforced)' })
  async postJournal(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    assertAdmin(req.user, 'Admin required to post journals');
    const userId = req.user.userId ?? req.user.id;
    return this.poster.post(id, req.user.tenantId, userId);
  }
}

import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest, assertAdmin } from '../../common/helpers/role-helper';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  list(@Request() req: AuthRequest, @Query('status') status?: string) {
    return this.service.list(req.user.tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one reservation' })
  getOne(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    return this.service.getOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create reservation' })
  create(@Body() body: any, @Request() req: AuthRequest) {
    return this.service.create({
      tenantId: req.user.tenantId,
      branchId: body.branchId ?? req.user.branchId ?? null,
      clientId: Number(body.clientId),
      agreedPrice: Number(body.agreedPrice),
      depositRequired: body.depositRequired != null ? Number(body.depositRequired) : 0,
      notes: body.notes,
      createdById: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/attach-financing')
  @ApiOperation({ summary: 'Attach loan as APPROVED_PENDING_DELIVERY' })
  attachFinancing(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin required to attach financing');
    return this.service.attachFinancing({
      tenantId: req.user.tenantId,
      reservationId: id,
      loanId: Number(body.loanId),
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/allocate-bike')
  @ApiOperation({ summary: 'Allocate motorcycle (RESERVED)' })
  allocateBike(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    return this.service.allocateBike({
      tenantId: req.user.tenantId,
      reservationId: id,
      bikeId: Number(body.bikeId),
      userId: req.user.userId ?? req.user.id,
    });
  }

  @Post(':id/handover')
  @ApiOperation({ summary: 'Handover and activate loan' })
  handover(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    assertAdmin(req.user, 'Admin required for handover activation');
    return this.service.handoverAndActivate({
      tenantId: req.user.tenantId,
      reservationId: id,
      userId: req.user.userId ?? req.user.id,
      notes: body.notes,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel reservation and release bike' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthRequest,
  ) {
    return this.service.cancel({
      tenantId: req.user.tenantId,
      reservationId: id,
      reason: body.reason,
      userId: req.user.userId ?? req.user.id,
    });
  }
}

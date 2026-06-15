import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { AuthRequest } from '../../common/helpers/role-helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BikesService } from './bikes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

class UpdateBikeDto {
  model?: string;
  frame_number?: string;
  engine_number?: string;
  registration_number?: string;
  sale_price?: number;
  purchase_price?: number;
}

@ApiTags('Bikes')
@Controller('bikes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  @Post()
  async create(@Body() data: any) {
    return await this.bikesService.create(data);
  }

  @Get()
  async findAll(@Request() req: AuthRequest) { return await this.bikesService.findAll(req?.user?.tenantId); }

  @Get('available')
  async findAvailable(@Request() req: AuthRequest) {
    const all = await this.bikesService.findAll(req?.user?.tenantId);
    return all.filter((b: any) => b.status === 'AVAILABLE');
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.bikesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateBikeDto,
    @Request() req: AuthRequest,
  ) {
    return await this.bikesService.update(id, data as any, req.user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthRequest,
  ) {
    return await this.bikesService.hardDelete(id, req.user);
  }

  @Patch(':id/maintenance')
  async setMaintenance(@Param('id', ParseIntPipe) id: number) {
    return await this.bikesService.setMaintenance(id);
  }
}
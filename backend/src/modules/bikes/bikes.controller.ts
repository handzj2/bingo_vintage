import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { AuthRequest } from '../../common/helpers/role-helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BikesService } from './bikes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard }   from '../auth/guards/roles.guard';
import { Roles }        from '../auth/decorators/roles.decorator';

class UpdateBikeDto {
  @IsOptional() @IsString()  model?: string;
  @IsOptional() @IsString()  frame_number?: string;
  @IsOptional() @IsString()  engine_number?: string;
  @IsOptional() @IsString()  registration_number?: string;
  @IsOptional() @IsNumber()  sale_price?: number;
  @IsOptional() @IsNumber()  purchase_price?: number;
  @IsOptional() @IsString()  status?: string;
  @IsOptional() @IsString()  notes?: string;
}

@ApiTags('Bikes')
@Controller('bikes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  @Post()
  @Roles('admin', 'manager')
  async create(@Body() data: any, @Request() req: AuthRequest) {
    return await this.bikesService.create({
      ...data,
      tenantId: req.user?.tenantId,
      branchId: req.user?.branchId,
    });
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
  @Roles('admin', 'manager')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateBikeDto,
    @Request() req: AuthRequest,
  ) {
    return await this.bikesService.update(id, data as any, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthRequest,
  ) {
    return await this.bikesService.hardDelete(id, req.user);
  }

  @Patch(':id/maintenance')
  @Roles('admin', 'manager')
  async setMaintenance(@Param('id', ParseIntPipe) id: number) {
    return await this.bikesService.setMaintenance(id);
  }
}
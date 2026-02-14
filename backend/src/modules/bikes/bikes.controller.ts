import { Controller, Get, Post, Body, Param, Patch, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { BikesService } from './bikes.service';

class CreateBikeDto {
  @ApiProperty({ example: 'Honda' }) bike_name: string;
  @ApiProperty({ example: 'CG125' }) model: string;
}

@ApiTags('Bikes')
@Controller('bikes')
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  @Post()
  async create(@Body() data: CreateBikeDto) {
    return await this.bikesService.create(data);
  }

  @Get()
  async findAll() { return await this.bikesService.findAll(); }
}
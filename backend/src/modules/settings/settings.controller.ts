import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@ApiTags('System Settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all system-wide settings' })
  async getAll() {
    return await this.settingsService.getAllSettings();
  }

  @Patch(':key')
  @Roles('admin') // 🔐 Only Admin can modify global rates [cite: 2026-01-10]
  @ApiOperation({ summary: 'Admin-only: Update a specific system setting' })
  async update(@Param('key') key: string, @Body('value') value: string) {
    return await this.settingsService.updateSetting(key, value);
  }
}
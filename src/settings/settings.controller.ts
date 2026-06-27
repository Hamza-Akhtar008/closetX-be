import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { SettingsService } from './settings.service';

@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Roles(...ADMIN_ACCESS)
  @Get('admin/settings')
  getAll() {
    return this.settings.getAll();
  }

  @Roles(...ADMIN_ACCESS)
  @Patch('admin/settings')
  update(@Body() body: Record<string, unknown>) {
    return this.settings.setMany(body);
  }

  @Public()
  @Get('settings/public')
  publicSettings() {
    return this.settings.publicSettings();
  }
}

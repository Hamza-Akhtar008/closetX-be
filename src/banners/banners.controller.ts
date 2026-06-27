import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller()
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Public()
  @Get('banners/active')
  active() {
    return this.banners.listActive();
  }

  @Roles(...ADMIN_ACCESS)
  @Get('admin/banners')
  list() {
    return this.banners.list();
  }

  @Roles(...ADMIN_ACCESS)
  @Post('admin/banners')
  create(@Body() dto: CreateBannerDto) {
    return this.banners.create(dto);
  }

  @Roles(...ADMIN_ACCESS)
  @Patch('admin/banners/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.banners.update(id, dto);
  }

  @Roles(...ADMIN_ACCESS)
  @Delete('admin/banners/:id')
  remove(@Param('id') id: string) {
    return this.banners.remove(id);
  }
}

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
import { FaqService } from './faq.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

@Public()
@Controller('faqs')
export class PublicFaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  list() {
    return this.service.listPublic();
  }
}

@Roles(...ADMIN_ACCESS)
@Controller('admin/faqs')
export class AdminFaqController {
  constructor(private readonly service: FaqService) {}

  @Get()
  list() {
    return this.service.adminList();
  }

  @Post()
  create(@Body() dto: CreateFaqDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

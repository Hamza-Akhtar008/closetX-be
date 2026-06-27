import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { EmailTemplatesService } from './email-templates.service';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Roles(...ADMIN_ACCESS)
@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(private readonly templates: EmailTemplatesService) {}

  @Get()
  list() {
    return this.templates.listMeta();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.templates.get(key);
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templates.update(key, dto);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { ListingsService } from './listings.service';
import { RejectListingDto } from './dto/reject-listing.dto';

@Roles(...ADMIN_ACCESS)
@Controller('admin/listings')
export class AdminListingsController {
  constructor(private readonly service: ListingsService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.service.adminList(status);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.adminDetail(id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() admin: User, @Param('id') id: string) {
    return this.service.approve(admin.id, id);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
  ) {
    return this.service.reject(admin.id, id, dto.reason);
  }
}

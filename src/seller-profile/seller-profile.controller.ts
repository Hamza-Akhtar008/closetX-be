import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SELLER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { SellerProfileService } from './seller-profile.service';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

@Roles(...SELLER_ACCESS)
@Controller('seller/profile')
export class SellerProfileController {
  constructor(private readonly service: SellerProfileService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.service.getProfile(user.id);
  }

  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdateSellerProfileDto) {
    return this.service.update(user.id, dto);
  }
}

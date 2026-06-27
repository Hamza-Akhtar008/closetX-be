import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BUYER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { AccountService } from './account.service';
import {
  UpdateAccountProfileDto,
  UpdateBillingDto,
  UpdatePreferencesDto,
} from './dto/account.dto';

@Roles(...BUYER_ACCESS)
@Controller('account')
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.service.getAccount(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateAccountProfileDto) {
    return this.service.updateProfile(user.id, dto);
  }

  @Patch('billing')
  updateBilling(@CurrentUser() user: User, @Body() dto: UpdateBillingDto) {
    return this.service.updateBilling(user.id, dto);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    return this.service.updatePreferences(user.id, dto);
  }
}

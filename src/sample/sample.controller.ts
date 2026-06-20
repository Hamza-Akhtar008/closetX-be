import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ADMIN_ACCESS,
  SELLER_ACCESS,
} from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';

/** Demonstrates RBAC. Both routes sit behind the global JwtAuthGuard. */
@Controller('sample')
export class SampleController {
  @Roles(...SELLER_ACCESS)
  @Get('seller')
  sellerArea(@CurrentUser() user: User) {
    return { ok: true, area: 'seller', roleId: user.roleId };
  }

  @Roles(...ADMIN_ACCESS)
  @Get('admin')
  adminArea(@CurrentUser() user: User) {
    return { ok: true, area: 'admin', roleId: user.roleId };
  }
}

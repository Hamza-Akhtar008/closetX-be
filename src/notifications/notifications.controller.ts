import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

/** Any authenticated user's in-app notification feed. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id);
  }

  @Post(':id/read')
  read(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markRead(user.id, id);
  }
}

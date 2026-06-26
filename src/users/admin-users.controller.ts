import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ADMIN_ACCESS } from '../common/constants/roles.constant';
import { UsersService } from './users.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';

@Roles(...ADMIN_ACCESS)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('tab') tab?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.users.adminList({
      tab,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  stats() {
    return this.users.adminStats();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="closetx-users.csv"')
  export() {
    return this.users.exportCsv();
  }

  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.users.createByAdmin(dto);
  }

  @Post(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto) {
    return this.users.setStatus(id, dto.status);
  }
}

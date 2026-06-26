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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SELLER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { ListingsService } from './listings.service';
import { PresignPhotoDto } from './dto/presign-photo.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Roles(...SELLER_ACCESS)
@Controller('seller/listings')
export class SellerListingsController {
  constructor(private readonly service: ListingsService) {}

  @Post('photos/presign')
  presign(@CurrentUser() user: User, @Body() dto: PresignPhotoDto) {
    return this.service.presignPhoto(user.id, dto.contentType);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateListingDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.listForUser(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.publish(user.id, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.pause(user.id, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.restore(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}

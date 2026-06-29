import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { IsArray, IsString, IsUUID } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BUYER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { WishlistService } from './wishlist.service';

class AddDto {
  @IsString()
  @IsUUID()
  listingId: string;
}

class IdsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];
}

@Roles(...BUYER_ACCESS)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.service.getWishlist(user.id);
  }

  @Post()
  add(@CurrentUser() user: User, @Body() dto: AddDto) {
    return this.service.add(user.id, dto.listingId);
  }

  @Post('merge')
  merge(@CurrentUser() user: User, @Body() dto: IdsDto) {
    return this.service.merge(user.id, dto.ids);
  }

  @Delete(':listingId')
  remove(@CurrentUser() user: User, @Param('listingId') listingId: string) {
    return this.service.remove(user.id, listingId);
  }
}

@Public()
@Controller('wishlist')
export class PublicWishlistController {
  constructor(private readonly service: WishlistService) {}

  @Post('resolve')
  resolve(@Body() dto: IdsDto) {
    return this.service.resolveItems(dto.ids);
  }
}

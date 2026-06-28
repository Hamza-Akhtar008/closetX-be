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
import { CartService } from './cart.service';

class AddToCartDto {
  @IsString()
  @IsUUID()
  listingId: string;
}

class CartIdsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  ids: string[];
}

/** Buyer-scoped server cart. */
@Roles(...BUYER_ACCESS)
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.service.getCart(user.id);
  }

  @Post()
  add(@CurrentUser() user: User, @Body() dto: AddToCartDto) {
    return this.service.add(user.id, dto.listingId);
  }

  @Post('merge')
  merge(@CurrentUser() user: User, @Body() dto: CartIdsDto) {
    return this.service.merge(user.id, dto.ids);
  }

  @Delete(':listingId')
  remove(@CurrentUser() user: User, @Param('listingId') listingId: string) {
    return this.service.remove(user.id, listingId);
  }
}

/** Public cart-line resolution for guest (localStorage) carts. */
@Public()
@Controller('cart')
export class PublicCartController {
  constructor(private readonly service: CartService) {}

  @Post('resolve')
  resolve(@Body() dto: CartIdsDto) {
    return this.service.resolveLines(dto.ids);
  }
}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BUYER_ACCESS, SELLER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { CheckoutDto, UpdateOrderStatusDto } from './dto/checkout.dto';

@Roles(...BUYER_ACCESS)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  checkout(@CurrentUser() user: User, @Body() dto: CheckoutDto) {
    return this.service.checkout(user.id, dto);
  }
}

@Roles(...BUYER_ACCESS)
@Controller('orders')
export class BuyerOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.buyerOrders(user.id);
  }

  @Post(':id/received')
  received(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markReceived(user.id, id);
  }
}

@Roles(...SELLER_ACCESS)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.sellerOrders(user.id);
  }

  @Post(':id/status')
  status(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(user.id, id, dto.status);
  }
}

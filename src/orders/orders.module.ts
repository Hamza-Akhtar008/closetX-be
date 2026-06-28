import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Address } from './entities/address.entity';
import { Listing } from '../listings/entities/listing.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { User } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { AddressesService } from './addresses.service';
import {
  CheckoutController,
  BuyerOrdersController,
  SellerOrdersController,
} from './orders.controller';
import { AddressesController } from './addresses.controller';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Address, Listing, CartItem, User]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [
    CheckoutController,
    BuyerOrdersController,
    SellerOrdersController,
    AddressesController,
  ],
  providers: [OrdersService, AddressesService, S3Service],
})
export class OrdersModule {}

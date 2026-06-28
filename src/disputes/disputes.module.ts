import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './entities/dispute.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { DisputesService } from './disputes.service';
import {
  BuyerDisputesController,
  SellerDisputesController,
  AdminDisputesController,
} from './disputes.controller';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, Order, OrderItem, Listing, User]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [
    BuyerDisputesController,
    SellerDisputesController,
    AdminDisputesController,
  ],
  providers: [DisputesService, S3Service],
})
export class DisputesModule {}

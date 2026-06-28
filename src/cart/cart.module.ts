import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { CartService } from './cart.service';
import { CartController, PublicCartController } from './cart.controller';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, Listing])],
  controllers: [CartController, PublicCartController],
  providers: [CartService, S3Service],
})
export class CartModule {}

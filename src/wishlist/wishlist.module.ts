import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController, PublicWishlistController } from './wishlist.controller';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, Listing])],
  controllers: [WishlistController, PublicWishlistController],
  providers: [WishlistService, S3Service],
})
export class WishlistModule {}

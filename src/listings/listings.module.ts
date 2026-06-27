import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { ListingsService } from './listings.service';
import { SellerListingsController } from './seller-listings.controller';
import { AdminListingsController } from './admin-listings.controller';
import { ListingPhotosController } from './listing-photos.controller';
import { MailModule } from '../mail/mail.module';
import { SellerVerificationModule } from '../seller-verification/seller-verification.module';
import { CatalogModule } from '../catalog/catalog.module';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    MailModule,
    SellerVerificationModule,
    CatalogModule,
  ],
  controllers: [
    SellerListingsController,
    AdminListingsController,
    ListingPhotosController,
  ],
  providers: [ListingsService, S3Service],
})
export class ListingsModule {}

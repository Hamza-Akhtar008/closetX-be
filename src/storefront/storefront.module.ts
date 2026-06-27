import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Category } from '../catalog/entities/category.entity';
import { Brand } from '../catalog/entities/brand.entity';
import { SellerProfile } from '../seller-profile/entities/seller-profile.entity';
import { SellerVerificationModule } from '../seller-verification/seller-verification.module';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, Category, Brand, SellerProfile]),
    SellerVerificationModule,
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService, S3Service],
})
export class StorefrontModule {}

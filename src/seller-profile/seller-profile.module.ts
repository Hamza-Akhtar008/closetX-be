import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerProfile } from './entities/seller-profile.entity';
import { Listing } from '../listings/entities/listing.entity';
import { SellerProfileService } from './seller-profile.service';
import { SellerProfileController } from './seller-profile.controller';
import { UsersModule } from '../users/users.module';
import { SellerVerificationModule } from '../seller-verification/seller-verification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellerProfile, Listing]),
    UsersModule,
    SellerVerificationModule,
  ],
  controllers: [SellerProfileController],
  providers: [SellerProfileService],
})
export class SellerProfileModule {}

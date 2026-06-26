import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerVerification } from './entities/seller-verification.entity';
import { SellerVerificationService } from './seller-verification.service';
import { SellerVerificationController } from './seller-verification.controller';
import { AdminVerificationController } from './admin-verification.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { CryptoService } from '../common/crypto/crypto.service';
import { S3Service } from '../common/storage/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellerVerification]),
    UsersModule,
    MailModule,
  ],
  controllers: [SellerVerificationController, AdminVerificationController],
  providers: [SellerVerificationService, CryptoService, S3Service],
  exports: [SellerVerificationService],
})
export class SellerVerificationModule {}

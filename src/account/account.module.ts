import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuyerProfile } from './entities/buyer-profile.entity';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([BuyerProfile]), UsersModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}

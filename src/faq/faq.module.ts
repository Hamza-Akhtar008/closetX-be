import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { FaqService } from './faq.service';
import { PublicFaqController, AdminFaqController } from './faq.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Faq])],
  controllers: [PublicFaqController, AdminFaqController],
  providers: [FaqService],
})
export class FaqModule {}

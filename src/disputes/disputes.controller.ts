import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ADMIN_ACCESS,
  BUYER_ACCESS,
  SELLER_ACCESS,
} from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import { DisputesService } from './disputes.service';
import {
  CreateDisputeDto,
  PresignDisputePhotoDto,
  ResolveDisputeDto,
  SellerRespondDto,
} from './dto/dispute.dto';

@Roles(...BUYER_ACCESS)
@Controller('disputes')
export class BuyerDisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post('photos/presign')
  presign(@CurrentUser() user: User, @Body() dto: PresignDisputePhotoDto) {
    return this.service.presignPhoto(user.id, dto.contentType);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateDisputeDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.listForBuyer(user.id);
  }

  @Post(':id/escalate')
  escalate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.escalate(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.cancel(user.id, id);
  }
}

@Roles(...SELLER_ACCESS)
@Controller('seller/disputes')
export class SellerDisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.listForSeller(user.id);
  }

  @Post(':id/respond')
  respond(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SellerRespondDto) {
    return this.service.sellerRespond(user.id, id, dto);
  }

  @Post(':id/refund')
  refund(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.sellerRefund(user.id, id);
  }
}

@Roles(...ADMIN_ACCESS)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.service.adminList(status);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.service.adminResolve(id, dto);
  }
}

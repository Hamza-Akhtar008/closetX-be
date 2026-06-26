import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SELLER_ACCESS } from '../common/constants/roles.constant';
import { User } from '../users/entities/user.entity';
import {
  SellerVerificationService,
  UploadedImage,
} from './seller-verification.service';
import { SubmitNationalIdDto } from './dto/submit-national-id.dto';
import { SubmitIbanDto } from './dto/submit-iban.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';

const imageFilter = (
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
) => cb(null, /^image\/(png|jpe?g)$/.test(file.mimetype));

@Roles(...SELLER_ACCESS)
@Controller('seller/verification')
export class SellerVerificationController {
  constructor(private readonly service: SellerVerificationService) {}

  @Get()
  status(@CurrentUser() user: User) {
    return this.service.getForUser(user.id);
  }

  @Post('national-id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      { limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: imageFilter },
    ),
  )
  submitNationalId(
    @CurrentUser() user: User,
    @Body() dto: SubmitNationalIdDto,
    @UploadedFiles()
    files: { front?: UploadedImage[]; back?: UploadedImage[] },
  ) {
    const front = files?.front?.[0];
    const back = files?.back?.[0];
    if (!front || !back) throw new BadRequestException('frontAndBackRequired');
    return this.service.submitNationalId(user.id, dto.idNumber, front, back);
  }

  @Post('iban')
  submitIban(@CurrentUser() user: User, @Body() dto: SubmitIbanDto) {
    return this.service.submitIban(user.id, dto.iban);
  }

  @Post('terms')
  acceptTerms(@CurrentUser() user: User, @Body() dto: AcceptTermsDto) {
    return this.service.acceptTerms(user.id, dto.locale);
  }
}

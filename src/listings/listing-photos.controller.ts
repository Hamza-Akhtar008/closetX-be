import {
  BadRequestException,
  Controller,
  NotFoundException,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { S3Service } from '../common/storage/s3.service';

/**
 * Dev-only raw-PUT receiver that backs the pre-signed-PUT fallback when there's
 * no S3 bucket (see S3Service.createPresignedPutUrl). The browser PUTs the
 * WebP bytes here exactly as it would to a signed S3 URL. Public (no auth) to
 * mirror an S3 signed URL; disabled in production (real S3 is used there).
 */
@Controller('listings/photos')
export class ListingPhotosController {
  constructor(
    private readonly s3: S3Service,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Put('dev-upload')
  async devUpload(@Query('key') key: string, @Req() req: Request) {
    if (this.config.get<string>('nodeEnv') === 'production') {
      throw new NotFoundException();
    }
    // Allow the dev-upload prefixes used by pre-signed PUTs; block traversal.
    const allowed =
      !!key &&
      (key.startsWith('listings/') || key.startsWith('disputes/')) &&
      !key.includes('..');
    if (!allowed) {
      throw new BadRequestException('invalidKey');
    }
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException('emptyBody');
    }
    await this.s3.putLocal(key, body);
    return { key };
  }
}

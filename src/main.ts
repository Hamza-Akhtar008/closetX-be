import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { raw } from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('frontendUrl'),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (config.get<string>('nodeEnv') !== 'production') {
    // Dev only: serve locally-stored KYC uploads so admins can view ID images
    // without S3. In production images live in a PRIVATE bucket and are read via
    // short-lived pre-signed URLs instead — never served statically.
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
    // Dev only: accept raw binary PUTs to the listing-photo upload fallback so
    // the browser's "pre-signed PUT" upload works without real S3.
    app.use('/listings/photos/dev-upload', raw({ type: () => true, limit: '12mb' }));
  }

  // Bind 0.0.0.0 so platforms like Render can detect the open port.
  await app.listen(config.get<number>('port') ?? 5001, '0.0.0.0');
}
void bootstrap();

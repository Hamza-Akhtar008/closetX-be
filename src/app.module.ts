import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { SellerVerificationModule } from './seller-verification/seller-verification.module';
import { ListingsModule } from './listings/listings.module';
import { SettingsModule } from './settings/settings.module';
import { BannersModule } from './banners/banners.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { CatalogModule } from './catalog/catalog.module';
import { SellerProfileModule } from './seller-profile/seller-profile.module';
import { AccountModule } from './account/account.module';
import { StorefrontModule } from './storefront/storefront.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SampleController } from './sample/sample.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        url: cfg.get<string>('database.url'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: false,
        extra: { max: 10 },
      }),
    }),
    UsersModule,
    RolesModule,
    AuthModule,
    SellerVerificationModule,
    ListingsModule,
    SettingsModule,
    BannersModule,
    EmailTemplatesModule,
    CatalogModule,
    SellerProfileModule,
    AccountModule,
    StorefrontModule,
  ],
  controllers: [AppController, SampleController],
  providers: [
    AppService,
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

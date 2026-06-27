import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpdateAccountProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  stylePreferences?: string[];
}

export class UpdateBillingDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(160) line1?: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(60) country?: string;
}

class BuyerNotificationsDto {
  @IsOptional() @IsBoolean() orderUpdates?: boolean;
  @IsOptional() @IsBoolean() priceDrops?: boolean;
  @IsOptional() @IsBoolean() newArrivals?: boolean;
  @IsOptional() @IsBoolean() sellerMessages?: boolean;
  @IsOptional() @IsBoolean() marketing?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BuyerNotificationsDto)
  notifications?: BuyerNotificationsDto;
}

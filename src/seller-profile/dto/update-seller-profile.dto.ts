import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PoliciesDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  shipping?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  returns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  authenticity?: string;
}

class NotificationsDto {
  @IsOptional() @IsBoolean() newOrders?: boolean;
  @IsOptional() @IsBoolean() offers?: boolean;
  @IsOptional() @IsBoolean() messages?: boolean;
  @IsOptional() @IsBoolean() payouts?: boolean;
  @IsOptional() @IsBoolean() marketing?: boolean;
}

export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  about?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PoliciesDto)
  policies?: PoliciesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;

  @IsOptional()
  @IsBoolean()
  vacationMode?: boolean;
}

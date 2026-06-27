import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingOptionDto {
  @IsString() @MaxLength(40) method: string;
  @IsString() @MaxLength(40) dispatchTime: string;
}

export class CreateListingDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() @MaxLength(40) subcategory?: string;
  @IsOptional() @IsString() @MaxLength(40) condition?: string;
  @IsOptional() @IsString() @MaxLength(40) size?: string;
  @IsOptional() @IsString() @MaxLength(40) color?: string;

  @IsNumber()
  @Min(0)
  priceUsd: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingOptionDto)
  @ArrayMaxSize(6)
  shippingOptions?: ShippingOptionDto[];

  /** S3 object keys from prior pre-signed uploads; first = cover. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  photoKeys?: string[];
}

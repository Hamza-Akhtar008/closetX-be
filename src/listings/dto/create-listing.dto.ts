import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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

  @IsOptional() @IsString() @MaxLength(40) shippingOption?: string;
  @IsOptional() @IsString() @MaxLength(40) dispatchTime?: string;

  /** S3 object keys from prior pre-signed uploads; first = cover. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  photoKeys?: string[];
}

import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional() @IsString() @MaxLength(40) label?: string;
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(40) phone: string;
  @IsString() @MaxLength(200) street: string;
  @IsOptional() @IsString() @MaxLength(120) apartment?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsString() @MaxLength(80) city: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(32) lat?: string;
  @IsOptional() @IsString() @MaxLength(32) lng?: string;
  @IsOptional() @IsString() @MaxLength(400) notes?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional() @IsString() @MaxLength(40) label?: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(200) street?: string;
  @IsOptional() @IsString() @MaxLength(120) apartment?: string;
  @IsOptional() @IsString() @MaxLength(80) region?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(32) lat?: string;
  @IsOptional() @IsString() @MaxLength(32) lng?: string;
  @IsOptional() @IsString() @MaxLength(400) notes?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

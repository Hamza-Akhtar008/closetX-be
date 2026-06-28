import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PresignDisputePhotoDto {
  @IsString()
  contentType: string;
}

export class CreateDisputeDto {
  @IsUUID()
  orderId: string;

  @IsIn(['not_received', 'not_as_described', 'wrong_item', 'arrived_damaged'])
  reason: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  detail: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  photoKeys?: string[];
}

export class SellerRespondDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  message: string;
}

export class ResolveDisputeDto {
  @IsIn(['refund', 'reject'])
  decision: 'refund' | 'reject';

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  resolution: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

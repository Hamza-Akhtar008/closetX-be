import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from './address.dto';

export class CheckoutDto {
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  @IsIn(['standard', 'express'])
  deliveryMethod: 'standard' | 'express';

  @IsIn(['mada', 'visa', 'mastercard', 'applepay', 'stcpay'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsBoolean()
  saveAddress?: boolean;
}

export class UpdateOrderStatusDto {
  @IsIn(['confirmed', 'preparing', 'shipped', 'in_transit'])
  status: 'confirmed' | 'preparing' | 'shipped' | 'in_transit';
}

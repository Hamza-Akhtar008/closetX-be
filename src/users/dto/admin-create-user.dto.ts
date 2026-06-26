import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { RoleChoice } from '../../common/constants/roles.constant';

/** Admin creates an account directly — email is auto-verified. */
export class AdminCreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsIn(['buyer', 'seller', 'both'])
  role: RoleChoice;
}

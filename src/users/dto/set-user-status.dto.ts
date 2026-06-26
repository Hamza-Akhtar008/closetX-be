import { IsIn } from 'class-validator';

export class SetUserStatusDto {
  @IsIn(['active', 'suspended', 'banned'])
  status: 'active' | 'suspended' | 'banned';
}

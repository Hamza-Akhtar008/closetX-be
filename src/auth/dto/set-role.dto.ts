import { IsIn } from 'class-validator';
import type { RoleChoice } from '../../common/constants/roles.constant';

export class SetRoleDto {
  @IsIn(['buyer', 'seller', 'both'])
  role: RoleChoice;
}

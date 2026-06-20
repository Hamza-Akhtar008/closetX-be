import { SetMetadata } from '@nestjs/common';
import { RoleId } from '../../common/constants/roles.constant';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given role ids (RolesGuard enforces it). */
export const Roles = (...roles: RoleId[]) => SetMetadata(ROLES_KEY, roles);

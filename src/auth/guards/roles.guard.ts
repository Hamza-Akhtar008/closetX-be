import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleId } from '../../common/constants/roles.constant';
import { User } from '../../users/entities/user.entity';

/** Runs after JwtAuthGuard; enforces @Roles(...) using the user's roleId. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleId[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user || user.roleId == null || !required.includes(user.roleId)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

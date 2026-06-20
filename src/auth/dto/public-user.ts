import { User } from '../../users/entities/user.entity';

/** Safe user shape returned to the client (never includes passwordHash). */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  roleId: number | null;
  role: { id: number; name: string } | null;
  emailVerified: boolean;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    roleId: user.roleId,
    role: user.role ? { id: user.role.id, name: user.role.name } : null,
    emailVerified: user.emailVerified,
  };
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import {
  RoleId,
  ROLE_CHOICE_TO_ID,
} from '../common/constants/roles.constant';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

type UserStatus = 'active' | 'suspended' | 'banned';

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.repo.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.repo.save(user);
  }

  async setRole(id: string, roleId: number): Promise<User> {
    await this.repo.update(id, { roleId });
    const user = await this.findById(id);
    if (!user) throw new Error('User not found after role update');
    return user;
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.repo.update(id, { emailVerified: true });
  }

  async setLocale(id: string, locale: string): Promise<void> {
    await this.repo.update(id, { locale });
  }

  async updateProfileBasics(
    id: string,
    fields: Partial<Pick<User, 'fullName' | 'phone' | 'avatarUrl' | 'country'>>,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await this.repo.update(id, fields);
  }

  // ───────────────────────────  Admin  ───────────────────────────

  private roleLabel(roleId: number | null): string {
    switch (roleId) {
      case RoleId.Admin:
        return 'Admin';
      case RoleId.Seller:
        return 'Seller';
      case RoleId.Buyer:
        return 'Buyer';
      case RoleId.SellerBuyer:
        return 'Seller + Buyer';
      default:
        return '—';
    }
  }

  private toAdminUser(u: User) {
    return {
      id: u.id,
      name: u.fullName || u.email,
      email: u.email,
      roleId: u.roleId,
      role: this.roleLabel(u.roleId),
      status: u.status as UserStatus,
      verified: u.emailVerified,
      joinedAt: u.createdAt,
    };
  }

  async adminList(params: { tab?: string; q?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const qb = this.repo.createQueryBuilder('u');
    // Admins are managed separately and never listed here.
    qb.where('u.roleId IS DISTINCT FROM :adminRole', { adminRole: RoleId.Admin });
    switch (params.tab) {
      case 'buyer':
        qb.andWhere('u.roleId IN (:...ids)', { ids: [RoleId.Buyer, RoleId.SellerBuyer] });
        break;
      case 'seller':
        qb.andWhere('u.roleId IN (:...ids)', { ids: [RoleId.Seller, RoleId.SellerBuyer] });
        break;
      case 'suspended':
        qb.andWhere('u.status = :s', { s: 'suspended' });
        break;
      case 'banned':
        qb.andWhere('u.status = :s', { s: 'banned' });
        break;
    }
    if (params.q?.trim()) {
      const like = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(u.fullName) LIKE :like OR LOWER(u.email) LIKE :like)', { like });
    }
    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { rows: rows.map((r) => this.toAdminUser(r)), total, page, limit };
  }

  async adminStats() {
    // Exclude admins from every count so the stats match the (admin-less) list.
    const base = () =>
      this.repo
        .createQueryBuilder('u')
        .where('u.roleId IS DISTINCT FROM :adminRole', { adminRole: RoleId.Admin });
    const [total, buyers, sellers, suspended, banned] = await Promise.all([
      base().getCount(),
      base().andWhere('u.roleId IN (:...ids)', { ids: [RoleId.Buyer, RoleId.SellerBuyer] }).getCount(),
      base().andWhere('u.roleId IN (:...ids)', { ids: [RoleId.Seller, RoleId.SellerBuyer] }).getCount(),
      base().andWhere('u.status = :s', { s: 'suspended' }).getCount(),
      base().andWhere('u.status = :s', { s: 'banned' }).getCount(),
    ]);
    return { total, buyers, sellers, suspended, banned };
  }

  async createByAdmin(dto: AdminCreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('emailTaken');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    // Admin-created accounts are pre-verified; sellers still complete KYC separately.
    const user = await this.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      roleId: ROLE_CHOICE_TO_ID[dto.role],
      emailVerified: true,
      status: 'active',
    });
    return this.toAdminUser(user);
  }

  async setStatus(id: string, status: UserStatus) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('userNotFound');
    if (user.roleId === RoleId.Admin) throw new ForbiddenException('cannotModifyAdmin');
    await this.repo.update(id, { status });
    user.status = status;
    return this.toAdminUser(user);
  }

  async exportCsv(): Promise<string> {
    const users = (await this.repo.find({ order: { createdAt: 'DESC' } })).filter(
      (u) => u.roleId !== RoleId.Admin,
    );
    const header = ['id', 'name', 'email', 'role', 'status', 'verified', 'joined'].join(',');
    const lines = users.map((u) =>
      [
        u.id,
        csvCell(u.fullName ?? ''),
        csvCell(u.email),
        csvCell(this.roleLabel(u.roleId)),
        u.status,
        u.emailVerified ? 'yes' : 'no',
        u.createdAt.toISOString(),
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuyerProfile } from './entities/buyer-profile.entity';
import { UsersService } from '../users/users.service';
import {
  UpdateAccountProfileDto,
  UpdateBillingDto,
  UpdatePreferencesDto,
} from './dto/account.dto';

type Billing = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};
type Notifications = {
  orderUpdates: boolean;
  priceDrops: boolean;
  newArrivals: boolean;
  sellerMessages: boolean;
  marketing: boolean;
};

const DEFAULT_BILLING: Billing = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: '',
};
const DEFAULT_NOTIFICATIONS: Notifications = {
  orderUpdates: true,
  priceDrops: true,
  newArrivals: false,
  sellerMessages: true,
  marketing: false,
};

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(BuyerProfile)
    private readonly repo: Repository<BuyerProfile>,
    private readonly users: UsersService,
  ) {}

  private parse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return fallback;
    }
  }

  private parseTags(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }

  private async getOrCreate(userId: string): Promise<BuyerProfile> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ userId }));
  }

  async getAccount(userId: string) {
    const profile = await this.getOrCreate(userId);
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('userNotFound');

    return {
      name: user.fullName || user.email,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      memberSince: user.createdAt,
      username: profile.username,
      city: profile.city,
      bio: profile.bio,
      stylePreferences: this.parseTags(profile.stylePreferences),
      billing: this.parse<Billing>(profile.billingAddress, DEFAULT_BILLING),
      preferences: {
        language: user.locale ?? 'en',
        notifications: this.parse<Notifications>(
          profile.notifications,
          DEFAULT_NOTIFICATIONS,
        ),
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateAccountProfileDto) {
    const profile = await this.getOrCreate(userId);
    if (dto.username !== undefined) profile.username = dto.username;
    if (dto.city !== undefined) profile.city = dto.city;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.stylePreferences !== undefined) {
      profile.stylePreferences = JSON.stringify(dto.stylePreferences);
    }
    await this.repo.save(profile);

    await this.users.updateProfileBasics(userId, {
      ...(dto.name !== undefined && { fullName: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
    });

    return this.getAccount(userId);
  }

  async updateBilling(userId: string, dto: UpdateBillingDto) {
    const profile = await this.getOrCreate(userId);
    const current = this.parse<Billing>(profile.billingAddress, DEFAULT_BILLING);
    profile.billingAddress = JSON.stringify({ ...current, ...dto });
    await this.repo.save(profile);
    return this.getAccount(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const profile = await this.getOrCreate(userId);
    if (dto.notifications) {
      const current = this.parse<Notifications>(
        profile.notifications,
        DEFAULT_NOTIFICATIONS,
      );
      profile.notifications = JSON.stringify({ ...current, ...dto.notifications });
      await this.repo.save(profile);
    }
    if (dto.language) await this.users.setLocale(userId, dto.language);
    return this.getAccount(userId);
  }
}

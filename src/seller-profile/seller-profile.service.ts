import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerProfile } from './entities/seller-profile.entity';
import { Listing } from '../listings/entities/listing.entity';
import { UsersService } from '../users/users.service';
import { SellerVerificationService } from '../seller-verification/seller-verification.service';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

type Policies = { shipping: string; returns: string; authenticity: string };
type Notifications = {
  newOrders: boolean;
  offers: boolean;
  messages: boolean;
  payouts: boolean;
  marketing: boolean;
};

const DEFAULT_POLICIES: Policies = { shipping: '', returns: '', authenticity: '' };
const DEFAULT_NOTIFICATIONS: Notifications = {
  newOrders: true,
  offers: true,
  messages: true,
  payouts: true,
  marketing: false,
};

@Injectable()
export class SellerProfileService {
  constructor(
    @InjectRepository(SellerProfile)
    private readonly repo: Repository<SellerProfile>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly users: UsersService,
    private readonly verification: SellerVerificationService,
  ) {}

  private parse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return fallback;
    }
  }

  private async getOrCreate(userId: string): Promise<SellerProfile> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ userId }));
  }

  async getProfile(userId: string) {
    const profile = await this.getOrCreate(userId);
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('userNotFound');
    const verification = await this.verification.getForUser(userId);

    const activeListings = await this.listings.count({
      where: { userId, status: 'ACTIVE' },
    });
    const rows = await this.listings
      .createQueryBuilder('l')
      .select('DISTINCT l.category', 'category')
      .where('l.userId = :userId', { userId })
      .andWhere("l.status = 'ACTIVE'")
      .andWhere('l.category IS NOT NULL')
      .getRawMany<{ category: string }>();
    const specialties = rows.map((r) => r.category).filter(Boolean);

    return {
      name: user.fullName || user.email,
      email: user.email,
      phone: user.phone,
      city: profile.city,
      memberSince: user.createdAt,
      verified: verification.status === 'approved',
      verificationStatus: verification.status,
      vacationMode: profile.vacationMode,
      bio: profile.bio,
      about: profile.about,
      mission: profile.mission,
      policies: this.parse<Policies>(profile.policies, DEFAULT_POLICIES),
      notifications: this.parse<Notifications>(
        profile.notifications,
        DEFAULT_NOTIFICATIONS,
      ),
      payout: { bank: verification.bankName, ibanLast4: verification.ibanLast4 },
      stats: { activeListings, itemsSold: 0, followers: 0, following: 0 },
      specialties,
    };
  }

  async update(userId: string, dto: UpdateSellerProfileDto) {
    const profile = await this.getOrCreate(userId);

    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.about !== undefined) profile.about = dto.about;
    if (dto.mission !== undefined) profile.mission = dto.mission;
    if (dto.city !== undefined) profile.city = dto.city;
    if (dto.vacationMode !== undefined) profile.vacationMode = dto.vacationMode;

    if (dto.policies) {
      const current = this.parse<Policies>(profile.policies, DEFAULT_POLICIES);
      profile.policies = JSON.stringify({ ...current, ...dto.policies });
    }
    if (dto.notifications) {
      const current = this.parse<Notifications>(
        profile.notifications,
        DEFAULT_NOTIFICATIONS,
      );
      profile.notifications = JSON.stringify({ ...current, ...dto.notifications });
    }
    await this.repo.save(profile);

    await this.users.updateProfileBasics(userId, {
      ...(dto.name !== undefined && { fullName: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
    });

    return this.getProfile(userId);
  }
}

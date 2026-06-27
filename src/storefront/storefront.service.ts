import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Category } from '../catalog/entities/category.entity';
import { Brand } from '../catalog/entities/brand.entity';
import { SellerProfile } from '../seller-profile/entities/seller-profile.entity';
import { SellerVerificationService } from '../seller-verification/seller-verification.service';
import { S3Service } from '../common/storage/s3.service';

const USD_TO_SAR = 3.75;
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string[];
  brand?: string[];
  condition?: string[];
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(SellerProfile)
    private readonly profiles: Repository<SellerProfile>,
    private readonly verification: SellerVerificationService,
    private readonly s3: S3Service,
  ) {}

  private keys(l: Listing): string[] {
    try {
      return l.photoKeys ? (JSON.parse(l.photoKeys) as string[]) : [];
    } catch {
      return [];
    }
  }

  /** Cover image of the most recent active listing in a category (or subcategory). */
  private async latestCover(
    category: string,
    subcategory?: string,
  ): Promise<string | null> {
    const latest = await this.listings.findOne({
      where: { status: 'ACTIVE', category, ...(subcategory ? { subcategory } : {}) },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
    const keys = latest ? this.keys(latest) : [];
    return keys[0] ? this.s3.getSignedReadUrl(keys[0]) : null;
  }

  private async card(l: Listing) {
    const keys = this.keys(l);
    const priceUsd = Number(l.priceUsd);
    return {
      id: l.id,
      title: l.title,
      brand: l.brand,
      category: l.category,
      subcategory: l.subcategory,
      condition: l.condition,
      size: l.size,
      priceUsd,
      priceSar: Math.round(priceUsd * USD_TO_SAR),
      coverUrl: keys[0] ? await this.s3.getSignedReadUrl(keys[0]) : null,
      isNew: l.publishedAt
        ? Date.now() - new Date(l.publishedAt).getTime() < NEW_WINDOW_MS
        : false,
      createdAt: l.createdAt,
    };
  }

  async home() {
    const recent = await this.listings.find({
      where: { status: 'ACTIVE' },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      take: 8,
    });
    const newArrivals = await Promise.all(recent.map((r) => this.card(r)));

    const cats = await this.categories.find({
      relations: { subcategories: true },
      order: { position: 'ASC' },
    });
    const categories = await Promise.all(
      cats.map(async (c) => {
        const count = await this.listings.count({
          where: { status: 'ACTIVE', category: c.name },
        });
        const subcategories = await Promise.all(
          (c.subcategories ?? []).map(async (s) => ({
            name: s.name,
            count: await this.listings.count({
              where: { status: 'ACTIVE', category: c.name, subcategory: s.name },
            }),
            coverUrl: await this.latestCover(c.name, s.name),
          })),
        );
        return {
          name: c.name,
          count,
          coverUrl: await this.latestCover(c.name),
          subcategories,
        };
      }),
    );

    // All catalog brands, with their active-listing counts — popular first.
    const allBrands = await this.brands.find();
    const countRows = await this.listings
      .createQueryBuilder('l')
      .select('LOWER(l.brand)', 'brand')
      .addSelect('COUNT(*)', 'count')
      .where("l.status = 'ACTIVE'")
      .andWhere('l.brand IS NOT NULL')
      .groupBy('LOWER(l.brand)')
      .getRawMany<{ brand: string; count: string }>();
    const countByBrand = new Map(
      countRows.map((r) => [r.brand, Number(r.count)]),
    );
    const popularBrands = allBrands
      .map((b) => ({
        name: b.name,
        count: countByBrand.get(b.name.toLowerCase()) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { newArrivals, categories, popularBrands };
  }

  async search(params: SearchParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(48, Math.max(1, params.limit ?? 24));

    const qb = this.listings.createQueryBuilder('l').where("l.status = 'ACTIVE'");

    if (params.q?.trim()) {
      qb.andWhere(
        '(LOWER(l.title) LIKE :q OR LOWER(l.brand) LIKE :q OR LOWER(l.category) LIKE :q OR LOWER(l.subcategory) LIKE :q)',
        { q: `%${params.q.trim().toLowerCase()}%` },
      );
    }
    if (params.category?.trim()) {
      qb.andWhere('LOWER(l.category) = :cat', {
        cat: params.category.trim().toLowerCase(),
      });
    }
    if (params.subcategory?.length) {
      qb.andWhere('LOWER(l.subcategory) IN (:...subs)', {
        subs: params.subcategory.map((s) => s.toLowerCase()),
      });
    }
    if (params.brand?.length) {
      qb.andWhere('LOWER(l.brand) IN (:...brands)', {
        brands: params.brand.map((b) => b.toLowerCase()),
      });
    }
    if (params.condition?.length) {
      qb.andWhere('l.condition IN (:...conds)', { conds: params.condition });
    }
    if (params.min != null) {
      qb.andWhere('l.priceUsd * :rate >= :min', { rate: USD_TO_SAR, min: params.min });
    }
    if (params.max != null) {
      qb.andWhere('l.priceUsd * :rate2 <= :max', { rate2: USD_TO_SAR, max: params.max });
    }

    switch (params.sort) {
      case 'price-asc':
        qb.orderBy('l.priceUsd', 'ASC');
        break;
      case 'price-desc':
        qb.orderBy('l.priceUsd', 'DESC');
        break;
      default:
        qb.orderBy('l.publishedAt', 'DESC').addOrderBy('l.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    const items = await Promise.all(rows.map((r) => this.card(r)));

    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  private shipping(l: Listing): { method: string; dispatchTime: string }[] {
    try {
      return l.shippingOptions
        ? (JSON.parse(l.shippingOptions) as { method: string; dispatchTime: string }[])
        : [];
    } catch {
      return [];
    }
  }

  async product(id: string) {
    const l = await this.listings.findOne({
      where: { id, status: 'ACTIVE' },
      relations: { user: true },
    });
    if (!l) throw new NotFoundException('listingNotFound');

    const keys = this.keys(l);
    const photos = await Promise.all(keys.map((k) => this.s3.getSignedReadUrl(k)));
    const priceUsd = Number(l.priceUsd);

    // Seller block
    const user = l.user ?? null;
    let verified = false;
    let city: string | null = null;
    let memberSince: Date | null = null;
    let activeListings = 0;
    const name = user ? user.fullName || user.email : 'Seller';
    if (user) {
      memberSince = user.createdAt;
      const v = await this.verification.getForUser(user.id);
      verified = v.status === 'approved';
      const profile = await this.profiles.findOne({ where: { userId: user.id } });
      city = profile?.city ?? null;
      activeListings = await this.listings.count({
        where: { userId: user.id, status: 'ACTIVE' },
      });
    }

    // Similar pieces — same category, excluding this one
    const sim = l.category
      ? await this.listings.find({
          where: { status: 'ACTIVE', category: l.category, id: Not(l.id) },
          order: { publishedAt: 'DESC', createdAt: 'DESC' },
          take: 4,
        })
      : [];
    const similar = await Promise.all(sim.map((s) => this.card(s)));

    return {
      id: l.id,
      title: l.title,
      description: l.description,
      brand: l.brand,
      category: l.category,
      subcategory: l.subcategory,
      condition: l.condition,
      size: l.size,
      color: l.color,
      priceUsd,
      priceSar: Math.round(priceUsd * USD_TO_SAR),
      shippingOptions: this.shipping(l),
      photos,
      isNew: l.publishedAt
        ? Date.now() - new Date(l.publishedAt).getTime() < NEW_WINDOW_MS
        : false,
      createdAt: l.createdAt,
      seller: {
        name,
        initial: (name.trim()[0] ?? 'S').toUpperCase(),
        verified,
        memberSince,
        city,
        activeListings,
      },
      similar,
    };
  }
}

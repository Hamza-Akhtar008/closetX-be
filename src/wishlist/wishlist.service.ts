import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { S3Service } from '../common/storage/s3.service';

const USD_TO_SAR = 3.75;
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem) private readonly repo: Repository<WishlistItem>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly s3: S3Service,
  ) {}

  private keys(l: Listing): string[] {
    try {
      return l.photoKeys ? (JSON.parse(l.photoKeys) as string[]) : [];
    } catch {
      return [];
    }
  }

  /** Resolve listing ids (in order) to product-card items. */
  async resolveItems(ids: string[]) {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return [];
    const rows = await this.listings.find({ where: { id: In(unique) } });
    const byId = new Map(rows.map((l) => [l.id, l]));

    const items = await Promise.all(
      unique.map(async (id) => {
        const l = byId.get(id);
        if (!l) return null;
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
          available: l.status === 'ACTIVE',
          createdAt: l.createdAt,
        };
      }),
    );
    return items.filter((i): i is NonNullable<typeof i> => i !== null);
  }

  async getWishlist(userId: string) {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return this.resolveItems(rows.map((r) => r.listingId));
  }

  async add(userId: string, listingId: string) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (listing) {
      const exists = await this.repo.findOne({ where: { userId, listingId } });
      if (!exists) await this.repo.save(this.repo.create({ userId, listingId }));
    }
    return this.getWishlist(userId);
  }

  async remove(userId: string, listingId: string) {
    await this.repo.delete({ userId, listingId });
    return this.getWishlist(userId);
  }

  async merge(userId: string, ids: string[]) {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length) {
      const valid = await this.listings.find({ where: { id: In(unique) } });
      const validIds = new Set(valid.map((l) => l.id));
      const existing = await this.repo.find({ where: { userId } });
      const have = new Set(existing.map((i) => i.listingId));
      const toAdd = unique.filter((id) => validIds.has(id) && !have.has(id));
      if (toAdd.length) {
        await this.repo.save(toAdd.map((listingId) => this.repo.create({ userId, listingId })));
      }
    }
    return this.getWishlist(userId);
  }
}

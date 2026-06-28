import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { S3Service } from '../common/storage/s3.service';

const USD_TO_SAR = 3.75;

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private readonly repo: Repository<CartItem>,
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

  /** Resolve listing ids (in order) to cart lines with live availability. */
  async resolveLines(ids: string[]) {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return [];

    const rows = await this.listings.find({
      where: { id: In(unique) },
      relations: { user: true },
    });
    const byId = new Map(rows.map((l) => [l.id, l]));

    const lines = await Promise.all(
      unique.map(async (id) => {
        const l = byId.get(id);
        if (!l) return null;
        const keys = this.keys(l);
        const priceUsd = Number(l.priceUsd);
        const sellerName = l.user ? l.user.fullName || l.user.email : 'Seller';
        return {
          listingId: l.id,
          title: l.title,
          brand: l.brand,
          condition: l.condition,
          size: l.size,
          priceUsd,
          priceSar: Math.round(priceUsd * USD_TO_SAR),
          coverUrl: keys[0] ? await this.s3.getSignedReadUrl(keys[0]) : null,
          available: l.status === 'ACTIVE',
          seller: {
            id: l.userId,
            name: sellerName,
            initial: (sellerName.trim()[0] ?? 'S').toUpperCase(),
          },
        };
      }),
    );
    return lines.filter((l): l is NonNullable<typeof l> => l !== null);
  }

  async getCart(userId: string) {
    const items = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return this.resolveLines(items.map((i) => i.listingId));
  }

  async add(userId: string, listingId: string) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (listing) {
      const exists = await this.repo.findOne({ where: { userId, listingId } });
      if (!exists) {
        await this.repo.save(this.repo.create({ userId, listingId }));
      }
    }
    return this.getCart(userId);
  }

  async remove(userId: string, listingId: string) {
    await this.repo.delete({ userId, listingId });
    return this.getCart(userId);
  }

  /** Merge guest cart ids into the user's cart (union), then return it. */
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
    return this.getCart(userId);
  }
}

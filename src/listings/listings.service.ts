import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Listing, ListingStatus } from './entities/listing.entity';
import { S3Service } from '../common/storage/s3.service';
import { MailService } from '../mail/mail.service';
import { SellerVerificationService } from '../seller-verification/seller-verification.service';
import { CatalogService } from '../catalog/catalog.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const USD_TO_SAR = 3.75;

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing) private readonly repo: Repository<Listing>,
    private readonly s3: S3Service,
    private readonly mail: MailService,
    private readonly verification: SellerVerificationService,
    private readonly catalog: CatalogService,
  ) {}

  private keys(l: Listing): string[] {
    try {
      return l.photoKeys ? (JSON.parse(l.photoKeys) as string[]) : [];
    } catch {
      return [];
    }
  }

  private shipping(l: Listing): { method: string; dispatchTime: string }[] {
    try {
      return l.shippingOptions ? (JSON.parse(l.shippingOptions) as { method: string; dispatchTime: string }[]) : [];
    } catch {
      return [];
    }
  }

  private async toResponse(l: Listing) {
    const keys = this.keys(l);
    const photoUrls = await Promise.all(keys.map((k) => this.s3.getSignedReadUrl(k)));
    const priceUsd = Number(l.priceUsd);
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
      priceSar: Math.round(priceUsd * USD_TO_SAR * 100) / 100,
      shippingOptions: this.shipping(l),
      status: l.status,
      rejectionReason: l.status === 'REJECTED' ? l.rejectionReason : null,
      coverUrl: photoUrls[0] ?? null,
      photoUrls,
      photoKeys: keys,
      photoCount: keys.length,
      publishedAt: l.publishedAt,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  // ───────────────────────────  Seller  ───────────────────────────

  async presignPhoto(userId: string, contentType: string) {
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
    const key = `listings/${userId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.s3.createPresignedPutUrl(key, contentType);
    return { key, uploadUrl };
  }

  async create(userId: string, dto: CreateListingDto) {
    if (dto.brand?.trim()) await this.catalog.ensureBrand(dto.brand);
    const l = this.repo.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      brand: dto.brand ?? null,
      category: dto.category ?? null,
      subcategory: dto.subcategory ?? null,
      condition: dto.condition ?? null,
      size: dto.size ?? null,
      color: dto.color ?? null,
      priceUsd: dto.priceUsd,
      shippingOptions: JSON.stringify(dto.shippingOptions ?? []),
      photoKeys: JSON.stringify(dto.photoKeys ?? []),
      status: 'DRAFT',
    });
    return this.toResponse(await this.repo.save(l));
  }

  async listForUser(userId: string) {
    const rows = await this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return Promise.all(rows.map((r) => this.toResponse(r)));
  }

  private async ownOrThrow(userId: string, id: string): Promise<Listing> {
    const l = await this.repo.findOne({ where: { id, userId } });
    if (!l) throw new NotFoundException('listingNotFound');
    return l;
  }

  async getOne(userId: string, id: string) {
    return this.toResponse(await this.ownOrThrow(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const l = await this.ownOrThrow(userId, id);
    if (dto.brand?.trim()) await this.catalog.ensureBrand(dto.brand);
    Object.assign(l, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.subcategory !== undefined && { subcategory: dto.subcategory }),
      ...(dto.condition !== undefined && { condition: dto.condition }),
      ...(dto.size !== undefined && { size: dto.size }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.priceUsd !== undefined && { priceUsd: dto.priceUsd }),
      ...(dto.shippingOptions !== undefined && { shippingOptions: JSON.stringify(dto.shippingOptions) }),
      ...(dto.photoKeys !== undefined && { photoKeys: JSON.stringify(dto.photoKeys) }),
    });
    return this.toResponse(await this.repo.save(l));
  }

  async publish(userId: string, id: string) {
    const l = await this.ownOrThrow(userId, id);
    if (l.status !== 'DRAFT' && l.status !== 'REJECTED') {
      throw new BadRequestException('onlyDraftCanPublish');
    }
    // Verified seller → live immediately; otherwise → admin review queue.
    const v = await this.verification.getForUser(userId);
    l.status = v.status === 'approved' ? 'ACTIVE' : 'UNDER_REVIEW';
    l.publishedAt = new Date();
    l.rejectionReason = null;
    return this.toResponse(await this.repo.save(l));
  }

  async pause(userId: string, id: string) {
    const l = await this.ownOrThrow(userId, id);
    if (l.status !== 'ACTIVE') throw new BadRequestException('onlyActiveCanPause');
    l.status = 'PAUSED';
    return this.toResponse(await this.repo.save(l));
  }

  async restore(userId: string, id: string) {
    const l = await this.ownOrThrow(userId, id);
    if (l.status !== 'PAUSED') throw new BadRequestException('onlyPausedCanRestore');
    l.status = 'ACTIVE';
    return this.toResponse(await this.repo.save(l));
  }

  async remove(userId: string, id: string) {
    const l = await this.ownOrThrow(userId, id);
    await this.repo.remove(l);
    return { id, deleted: true };
  }

  // ───────────────────────────  Admin  ───────────────────────────

  async adminList(status?: string) {
    const where = status && status !== 'all' ? { status: status as ListingStatus } : {};
    const rows = await this.repo.find({
      where,
      relations: { user: true },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
    });
    return Promise.all(
      rows.map(async (l) => {
        const keys = this.keys(l);
        return {
          id: l.id,
          userId: l.userId,
          seller: l.user?.fullName || l.user?.email || 'Seller',
          title: l.title,
          brand: l.brand,
          category: l.category,
          priceUsd: Number(l.priceUsd),
          priceSar: Math.round(Number(l.priceUsd) * USD_TO_SAR * 100) / 100,
          condition: l.condition,
          status: l.status,
          submitted: l.publishedAt ?? l.createdAt,
          rejectionReason: l.rejectionReason,
          coverUrl: keys[0] ? await this.s3.getSignedReadUrl(keys[0]) : null,
        };
      }),
    );
  }

  async adminDetail(id: string) {
    const l = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!l) throw new NotFoundException('listingNotFound');
    const keys = this.keys(l);
    return {
      id: l.id,
      seller: l.user?.fullName || l.user?.email || 'Seller',
      sellerEmail: l.user?.email ?? null,
      title: l.title,
      description: l.description,
      brand: l.brand,
      category: l.category,
      subcategory: l.subcategory,
      condition: l.condition,
      size: l.size,
      color: l.color,
      priceUsd: Number(l.priceUsd),
      priceSar: Math.round(Number(l.priceUsd) * USD_TO_SAR * 100) / 100,
      status: l.status,
      rejectionReason: l.rejectionReason,
      submitted: l.publishedAt ?? l.createdAt,
      photoUrls: await Promise.all(keys.map((k) => this.s3.getSignedReadUrl(k))),
    };
  }

  async approve(adminId: string, id: string) {
    const l = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!l) throw new NotFoundException('listingNotFound');
    l.status = 'ACTIVE';
    l.reviewedAt = new Date();
    l.reviewedBy = adminId;
    l.publishedAt = l.publishedAt ?? new Date();
    l.rejectionReason = null;
    await this.repo.save(l);
    if (l.user) {
      await this.mail.sendListingApproved(
        l.user.email,
        l.user.fullName ?? '',
        l.title,
        l.user.locale ?? 'en',
      );
    }
    return { id: l.id, status: l.status };
  }

  async reject(adminId: string, id: string, reason: string) {
    const l = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!l) throw new NotFoundException('listingNotFound');
    l.status = 'REJECTED';
    l.reviewedAt = new Date();
    l.reviewedBy = adminId;
    l.rejectionReason = reason;
    await this.repo.save(l);
    if (l.user) {
      await this.mail.sendListingRejected(
        l.user.email,
        l.user.fullName ?? '',
        l.title,
        reason,
        l.user.locale ?? 'en',
      );
    }
    return { id: l.id, status: l.status };
  }
}

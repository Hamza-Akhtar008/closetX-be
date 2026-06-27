import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

const SEED: Partial<Banner>[] = [
  { text: 'Free shipping across KSA on orders over SAR 200', placement: 'Top bar · All pages', status: 'live', tone: 'navy' },
  { text: '🎁 New drops every Thursday at 6 PM AST — set a reminder', placement: 'Home hero · Buyers', status: 'live', tone: 'brand' },
  { text: '🛍️ Seller fees reduced to 8% this month — list now', placement: 'Seller dash · 01 Jul', status: 'scheduled', tone: 'gold' },
];

@Injectable()
export class BannersService implements OnModuleInit {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @InjectRepository(Banner) private readonly repo: Repository<Banner>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      if ((await this.repo.count()) === 0) {
        await this.repo.save(SEED.map((b) => this.repo.create(b)));
      }
    } catch (err) {
      this.logger.warn(`Banner seeding skipped (run migrations?): ${(err as Error).message}`);
    }
  }

  list() {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  listActive() {
    return this.repo.find({ where: { status: 'live' }, order: { createdAt: 'ASC' } });
  }

  create(dto: CreateBannerDto) {
    return this.repo.save(this.repo.create({ ...dto, status: dto.status ?? 'paused' }));
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.repo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('bannerNotFound');
    Object.assign(banner, dto);
    return this.repo.save(banner);
  }

  async remove(id: string) {
    const banner = await this.repo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('bannerNotFound');
    await this.repo.remove(banner);
    return { id, deleted: true };
  }
}

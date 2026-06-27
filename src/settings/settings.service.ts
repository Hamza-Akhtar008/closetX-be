import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

/** Whitelist of editable setting keys (anything else is ignored on write). */
export const SETTING_KEYS = [
  'commission.platform',
  'commission.vat',
  'shipping.standard',
  'shipping.express',
  'fee.payment',
  'fee.chargeback',
  'platform.autoReleaseDays',
  'platform.minPayoutSar',
  'platform.disputeWindowDays',
  'platform.shippingReminderDays',
  'platform.otpExpirySec',
  'flag.listingsPerHourCap',
  'flag.featuredHome',
  'flag.maintenanceMode',
  'flag.sellerRegistration',
] as const;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
  ) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async get(key: string, fallback = ''): Promise<string> {
    const row = await this.repo.findOne({ where: { key } });
    return row?.value ?? fallback;
  }

  async getNumber(key: string, fallback = 0): Promise<number> {
    const v = Number(await this.get(key));
    return Number.isFinite(v) ? v : fallback;
  }

  async getBool(key: string, fallback = false): Promise<boolean> {
    const v = await this.get(key);
    return v === '' ? fallback : v === 'true';
  }

  async setMany(values: Record<string, unknown>): Promise<Record<string, string>> {
    const allowed = new Set<string>(SETTING_KEYS);
    const toSave = Object.entries(values)
      .filter(([k]) => allowed.has(k))
      .map(([key, value]) => ({ key, value: String(value) }));
    if (toSave.length) await this.repo.save(toSave);
    return this.getAll();
  }

  /** Subset the storefront/app may read without auth. */
  async publicSettings() {
    const all = await this.getAll();
    return {
      maintenanceMode: all['flag.maintenanceMode'] === 'true',
      sellerRegistration: all['flag.sellerRegistration'] !== 'false',
      commission: Number(all['commission.platform'] ?? '8'),
      vat: Number(all['commission.vat'] ?? '15'),
      featuredHome: Number(all['flag.featuredHome'] ?? '8'),
    };
  }
}

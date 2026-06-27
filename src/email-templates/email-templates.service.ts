import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import {
  verificationEmailHtml,
} from '../mail/templates/verification-email';
import {
  sellerApprovedHtml,
  sellerApprovedSubject,
  sellerRejectedHtml,
  sellerRejectedSubject,
} from '../mail/templates/seller-verification-email';
import {
  listingApprovedHtml,
  listingApprovedSubject,
  listingRejectedHtml,
  listingRejectedSubject,
} from '../mail/templates/listing-email';

/**
 * Default English templates, generated from the existing code templates with
 * {{token}} placeholders so the real designs are seeded into the DB and become
 * admin-editable. MailService interpolates these at send time.
 */
function defaults(): Partial<EmailTemplate>[] {
  return [
    {
      key: 'emailVerification',
      name: 'Email verification',
      subject: 'Verify your ClosetX email',
      html: verificationEmailHtml({ name: '{{name}}', verifyUrl: '{{verifyUrl}}', expiresInHours: 1 }),
    },
    {
      key: 'sellerApproved',
      name: 'Seller verification approved',
      subject: sellerApprovedSubject('en'),
      html: sellerApprovedHtml({ name: '{{name}}', locale: 'en' }, '{{ctaUrl}}'),
    },
    {
      key: 'sellerRejected',
      name: 'Seller verification rejected',
      subject: sellerRejectedSubject('en'),
      html: sellerRejectedHtml({ name: '{{name}}', reason: '{{reason}}', locale: 'en' }, '{{ctaUrl}}'),
    },
    {
      key: 'listingApproved',
      name: 'Listing approved',
      subject: listingApprovedSubject('en'),
      html: listingApprovedHtml('{{name}}', '{{title}}', 'en', '{{ctaUrl}}'),
    },
    {
      key: 'listingRejected',
      name: 'Listing rejected',
      subject: listingRejectedSubject('en'),
      html: listingRejectedHtml('{{name}}', '{{title}}', '{{reason}}', 'en', '{{ctaUrl}}'),
    },
  ];
}

function interpolate(s: string, vars: Record<string, string>): string {
  return s.replace(/{{\s*(\w+)\s*}}/g, (_m, k: string) => vars[k] ?? '');
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectRepository(EmailTemplate) private readonly repo: Repository<EmailTemplate>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed missing defaults (idempotent). Never crash boot — e.g. when the
    // migration hasn't run yet on a fresh DB.
    try {
      for (const d of defaults()) {
        const exists = await this.repo.findOne({ where: { key: d.key } });
        if (!exists) await this.repo.save(this.repo.create(d));
      }
    } catch (err) {
      this.logger.warn(
        `Email template seeding skipped (run migrations?): ${(err as Error).message}`,
      );
    }
  }

  /** List metadata (no html) for the settings table. */
  async listMeta() {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((r) => ({ key: r.key, name: r.name, subject: r.subject, updatedAt: r.updatedAt }));
  }

  async get(key: string) {
    const tpl = await this.repo.findOne({ where: { key } });
    if (!tpl) throw new NotFoundException('templateNotFound');
    return tpl;
  }

  async update(key: string, data: { subject?: string; html?: string }) {
    const tpl = await this.get(key);
    if (data.subject !== undefined) tpl.subject = data.subject;
    if (data.html !== undefined) tpl.html = data.html;
    return this.repo.save(tpl);
  }

  /** Render a template for sending; null if not found (caller uses code fallback). */
  async render(
    key: string,
    vars: Record<string, string>,
  ): Promise<{ subject: string; html: string; text: string } | null> {
    const tpl = await this.repo.findOne({ where: { key } });
    if (!tpl) return null;
    const html = interpolate(tpl.html, vars);
    return { subject: interpolate(tpl.subject, vars), html, text: htmlToText(html) };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  verificationEmailHtml,
  verificationEmailText,
} from './templates/verification-email';
import {
  sellerApprovedHtml,
  sellerApprovedSubject,
  sellerApprovedText,
  sellerRejectedHtml,
  sellerRejectedSubject,
  sellerRejectedText,
} from './templates/seller-verification-email';
import {
  listingApprovedHtml,
  listingApprovedSubject,
  listingApprovedText,
  listingRejectedHtml,
  listingRejectedSubject,
  listingRejectedText,
} from './templates/listing-email';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly smtpConfigured: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly templates: EmailTemplatesService,
  ) {
    this.from =
      this.config.get<string>('mail.from') ??
      'ClosetX <no-reply@closetx.app>';
    const host = this.config.get<string>('mail.host');
    this.smtpConfigured = !!host;

    if (host) {
      const user = this.config.get<string>('mail.user');
      const pass = this.config.get<string>('mail.pass');
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port') ?? 587,
        secure: this.config.get<boolean>('mail.secure') ?? false,
        auth: user && pass ? { user, pass } : undefined,
      });
    } else {
      // Dev fallback: build the message but don't deliver — the link is logged.
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn(
        'SMTP not configured (SMTP_HOST empty) — verification links are logged to the console, not emailed.',
      );
    }
  }

  /** Verify the SMTP connection + auth once at boot so misconfig is obvious. */
  async onModuleInit(): Promise<void> {
    if (!this.smtpConfigured) return;
    try {
      await this.transporter.verify();
      this.logger.log(
        `SMTP connection verified (${this.config.get<string>('mail.host')}:${this.config.get<number>('mail.port')}) — ready to send.`,
      );
    } catch (err) {
      this.logger.error(`SMTP connection FAILED: ${(err as Error).message}`);
    }
  }

  /** Sends the verification email; never throws so signup can't fail on SMTP. */
  async sendVerificationEmail(
    to: string,
    name: string,
    verifyUrl: string,
    expiresInHours: number,
  ): Promise<void> {
    await this.sendTemplated(
      'emailVerification',
      to,
      { name, verifyUrl },
      () => ({
        subject: 'Verify your ClosetX email',
        html: verificationEmailHtml({ name, verifyUrl, expiresInHours }),
        text: verificationEmailText({ name, verifyUrl, expiresInHours }),
      }),
    );
    // Always surface the link in dev so the flow is testable without SMTP.
    if (!this.smtpConfigured) {
      this.logger.log(`[DEV] Verification link for ${to}: ${verifyUrl}`);
    }
  }

  private frontendUrl(): string {
    return this.config.get<string>('frontendUrl') ?? 'http://localhost:3000';
  }

  /** Seller verification APPROVED. Uses the editable DB template, code fallback. */
  async sendSellerApproved(to: string, name: string, locale: string): Promise<void> {
    const ctaUrl = `${this.frontendUrl()}/seller`;
    await this.sendTemplated('sellerApproved', to, { name, ctaUrl }, () => ({
      subject: sellerApprovedSubject(locale),
      html: sellerApprovedHtml({ name, locale }, ctaUrl),
      text: sellerApprovedText({ name, locale }, ctaUrl),
    }));
  }

  /** Seller verification REJECTED — includes the reason. */
  async sendSellerRejected(
    to: string,
    name: string,
    reason: string,
    locale: string,
  ): Promise<void> {
    const ctaUrl = `${this.frontendUrl()}/seller/verification`;
    await this.sendTemplated('sellerRejected', to, { name, reason, ctaUrl }, () => ({
      subject: sellerRejectedSubject(locale),
      html: sellerRejectedHtml({ name, reason, locale }, ctaUrl),
      text: sellerRejectedText({ name, reason, locale }, ctaUrl),
    }));
  }

  /** Listing APPROVED. */
  async sendListingApproved(
    to: string,
    name: string,
    title: string,
    locale: string,
  ): Promise<void> {
    const ctaUrl = `${this.frontendUrl()}/seller/listings`;
    await this.sendTemplated('listingApproved', to, { name, title, ctaUrl }, () => ({
      subject: listingApprovedSubject(locale),
      html: listingApprovedHtml(name, title, locale, ctaUrl),
      text: listingApprovedText(name, title, locale, ctaUrl),
    }));
  }

  /** Listing REJECTED — includes the reason. */
  async sendListingRejected(
    to: string,
    name: string,
    title: string,
    reason: string,
    locale: string,
  ): Promise<void> {
    const ctaUrl = `${this.frontendUrl()}/seller/listings`;
    await this.sendTemplated('listingRejected', to, { name, title, reason, ctaUrl }, () => ({
      subject: listingRejectedSubject(locale),
      html: listingRejectedHtml(name, title, reason, locale, ctaUrl),
      text: listingRejectedText(name, title, reason, locale, ctaUrl),
    }));
  }

  /** Generic transactional order email (confirmation, status updates). */
  async sendOrderEmail(
    to: string,
    subject: string,
    heading: string,
    intro: string,
    rows: string[],
    ctaUrl: string,
    ctaLabel: string,
  ): Promise<void> {
    const items = rows
      .map(
        (r) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;">${r}</td></tr>`,
      )
      .join('');
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;color:#15324a;margin:0 0 8px;">${heading}</h1>
        <p style="font-size:14px;color:#555;margin:0 0 16px;">${intro}</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">${items}</table>
        <a href="${ctaUrl}" style="display:inline-block;background:#2e6f5e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${ctaLabel}</a>
        <p style="font-size:12px;color:#999;margin:24px 0 0;">ClosetX — Authenticated Pre-Loved Fashion</p>
      </div>`;
    const text = `${heading}\n\n${intro}\n\n${rows.join('\n')}\n\n${ctaLabel}: ${ctaUrl}`;
    await this.send(to, subject, html, text);
  }

  /**
   * Renders an editable DB template (with {{var}} interpolation) and sends it;
   * falls back to the code template when no DB row exists.
   */
  private async sendTemplated(
    key: string,
    to: string,
    vars: Record<string, string>,
    fallback: () => { subject: string; html: string; text: string },
  ): Promise<void> {
    const msg = (await this.templates.render(key, vars)) ?? fallback();
    await this.send(to, msg.subject, msg.html, msg.text);
  }

  /** Shared sender: logs in dev, swallows SMTP errors so flows never fail. */
  private async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      if (this.smtpConfigured) {
        this.logger.log(`Email "${subject}" to ${to} — id=${info.messageId}`);
      } else {
        this.logger.log(`[DEV] Email "${subject}" for ${to} (SMTP disabled).`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to send "${subject}" to ${to}: ${(err as Error).message}`,
      );
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  verificationEmailHtml,
  verificationEmailText,
} from './templates/verification-email';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly smtpConfigured: boolean;

  constructor(private readonly config: ConfigService) {
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
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Verify your ClosetX email',
        html: verificationEmailHtml({ name, verifyUrl, expiresInHours }),
        text: verificationEmailText({ name, verifyUrl, expiresInHours }),
      });
      if (this.smtpConfigured) {
        this.logger.log(
          `Verification email to ${to} — id=${info.messageId} accepted=${JSON.stringify(
            info.accepted,
          )} rejected=${JSON.stringify(info.rejected)} response=${info.response}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${(err as Error).message}`,
      );
    }
    // Always surface the link in dev so the flow is testable without SMTP.
    if (!this.smtpConfigured) {
      this.logger.log(`[DEV] Verification link for ${to}: ${verifyUrl}`);
    }
  }
}

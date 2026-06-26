import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * AES-256-GCM field encryption (for IBAN at rest) + sha256 hashing (national ID
 * uniqueness). The key comes from `ENCRYPTION_KEY` (32 bytes as hex or base64).
 * In non-production, a stable dev key is derived with a loud warning so the app
 * runs without secrets; in production a missing/short key throws at first use.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('crypto.encryptionKey');
    const isProd = this.config.get<string>('nodeEnv') === 'production';
    this.key = this.resolveKey(raw, isProd);
  }

  private resolveKey(raw: string | undefined, isProd: boolean): Buffer {
    if (raw) {
      const buf = /^[0-9a-fA-F]{64}$/.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'base64');
      if (buf.length === 32) return buf;
      if (isProd) {
        throw new Error('ENCRYPTION_KEY must be 32 bytes (hex=64 chars or base64).');
      }
      this.logger.warn('ENCRYPTION_KEY is not 32 bytes — deriving a dev key.');
    } else if (isProd) {
      throw new Error('ENCRYPTION_KEY is required in production.');
    } else {
      this.logger.warn(
        'ENCRYPTION_KEY not set — using an INSECURE derived dev key. Do not use in production.',
      );
    }
    // Deterministic dev key so encrypted values survive restarts in dev.
    return scryptSync(raw ?? 'closetx-dev-encryption-key', 'closetx-static-salt', 32);
  }

  /** Returns "iv:tag:ciphertext", each part base64. */
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, ctB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed ciphertext.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Stable sha256 of the national ID number — stored for uniqueness, never raw. */
  hashNationalId(idNumber: string): string {
    return createHash('sha256')
      .update(idNumber.replace(/\D/g, ''))
      .digest('hex');
  }
}

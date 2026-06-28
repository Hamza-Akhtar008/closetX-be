import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Private object storage for KYC ID images. Objects are uploaded with no public
 * access; reads happen only through short-lived pre-signed GET URLs (TTL from
 * config, default 1h). When `S3_BUCKET` is unset we fall back to local disk
 * under ./uploads so the flow is testable in dev without AWS — mirroring the
 * MailService JSON-transport fallback.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket?: string;
  private readonly ttl: number;
  private readonly client?: S3Client;
  private readonly localDir = join(process.cwd(), 'uploads');

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket');
    this.ttl = this.config.get<number>('storage.presignTtl') ?? 3600;
    if (this.bucket) {
      const accessKeyId = this.config.get<string>('storage.accessKeyId');
      const secretAccessKey = this.config.get<string>('storage.secretAccessKey');
      this.client = new S3Client({
        region: this.config.get<string>('storage.region') ?? 'me-south-1',
        credentials:
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : undefined,
        // AWS SDK v3 (>=3.726) adds a CRC32 checksum to pre-signed PUT URLs,
        // which breaks browser uploads (the pre-computed checksum can't match
        // the real bytes). Revert to legacy behaviour for browser PUTs.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
    } else {
      this.logger.warn(
        'S3_BUCKET not set — ID images are stored on local disk (./uploads). Do not use in production.',
      );
    }
  }

  /** Uploads a private object and returns the stored object key. */
  async putPrivate(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (this.client && this.bucket) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // No public-read ACL: the bucket stays private.
        }),
      );
      return key;
    }
    const path = join(this.localDir, key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, body);
    return key;
  }

  /**
   * Pre-signed PUT URL for a direct browser→S3 upload. In dev (no bucket) we
   * return a backend raw-PUT endpoint that writes to ./uploads instead, so the
   * client upload code path is identical in both environments.
   */
  async createPresignedPutUrl(
    key: string,
    contentType: string,
    ttlSeconds = this.ttl,
  ): Promise<string> {
    if (this.client && this.bucket) {
      return getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: ttlSeconds },
      );
    }
    const base =
      this.config.get<string>('publicApiUrl') ??
      `http://localhost:${this.config.get<number>('port') ?? 5001}`;
    return `${base}/listings/photos/dev-upload?key=${encodeURIComponent(key)}`;
  }

  /** Dev-only: persist a raw PUT body to local disk under the given key. */
  async putLocal(key: string, body: Buffer): Promise<void> {
    const path = join(this.localDir, key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, body);
  }

  /** Short-lived read URL for an object key (admin-only image viewing). */
  async getSignedReadUrl(key: string, ttlSeconds = this.ttl): Promise<string> {
    if (this.client && this.bucket) {
      return getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: ttlSeconds },
      );
    }
    // Dev: no real pre-signed URL — return an HTTP URL to the locally-served
    // file (see main.ts useStaticAssets) so admins can actually view the image.
    const base =
      this.config.get<string>('publicApiUrl') ??
      `http://localhost:${this.config.get<number>('port') ?? 5001}`;
    return `${base}/uploads/${key}`;
  }
}

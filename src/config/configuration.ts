/**
 * Typed configuration loaded by `ConfigModule`. Access via
 * `configService.get('jwt.accessSecret')` etc. (dotted paths).
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5001', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  // Public base URL of THIS API (used to build dev image URLs for /uploads).
  publicApiUrl: process.env.PUBLIC_API_URL,
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure:
      process.env.COOKIE_SECURE === 'true' ||
      process.env.NODE_ENV === 'production',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:5001/auth/google/callback',
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM ?? 'ClosetX <no-reply@closetx.app>',
  },
  emailVerification: {
    secret: process.env.EMAIL_VERIFICATION_SECRET as string,
    ttl: process.env.EMAIL_VERIFICATION_TTL ?? '1h',
  },
  storage: {
    region: process.env.AWS_REGION ?? 'me-south-1',
    bucket: process.env.S3_BUCKET, // private bucket; when empty we fall back to local disk (dev)
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // TTL (seconds) for pre-signed GET URLs to ID images. Spec: 1 hour.
    presignTtl: parseInt(process.env.S3_PRESIGN_TTL ?? '3600', 10),
  },
  crypto: {
    // 32-byte key (hex=64 chars or base64) for AES-256-GCM field encryption (IBAN).
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
});

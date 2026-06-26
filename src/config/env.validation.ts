import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/** Required/optional env vars. Boot fails fast if a required secret is missing. */
class EnvVars {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsNotEmpty()
  @IsString()
  FRONTEND_URL!: string;

  @IsOptional()
  @IsString()
  PUBLIC_API_URL?: string;

  @IsNotEmpty()
  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsNotEmpty()
  @IsString()
  EMAIL_VERIFICATION_SECRET!: string;

  @IsOptional() @IsString() EMAIL_VERIFICATION_TTL?: string;
  @IsOptional() @IsString() SMTP_HOST?: string;
  @IsOptional() @IsString() SMTP_PORT?: string;
  @IsOptional() @IsString() SMTP_USER?: string;
  @IsOptional() @IsString() SMTP_PASS?: string;
  @IsOptional() @IsString() SMTP_SECURE?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;

  @IsOptional() @IsString() JWT_ACCESS_TTL?: string;
  @IsOptional() @IsString() JWT_REFRESH_TTL?: string;
  @IsOptional() @IsString() COOKIE_DOMAIN?: string;
  @IsOptional() @IsString() COOKIE_SECURE?: string;
  // Google creds are optional so the app boots without them; the Google
  // strategy is only registered when GOOGLE_CLIENT_ID is present.
  @IsOptional() @IsString() GOOGLE_CLIENT_ID?: string;
  @IsOptional() @IsString() GOOGLE_CLIENT_SECRET?: string;
  @IsOptional() @IsString() GOOGLE_CALLBACK_URL?: string;

  // Seller-verification infra. All optional so the app boots in dev (S3 falls
  // back to local disk, encryption derives a dev key with a warning). In
  // production these MUST be set — CryptoService throws without ENCRYPTION_KEY.
  @IsOptional() @IsString() AWS_REGION?: string;
  @IsOptional() @IsString() S3_BUCKET?: string;
  @IsOptional() @IsString() AWS_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() AWS_SECRET_ACCESS_KEY?: string;
  @IsOptional() @IsString() S3_PRESIGN_TTL?: string;
  @IsOptional() @IsString() ENCRYPTION_KEY?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      'Invalid environment configuration:\n' +
        errors
          .map((e) => Object.values(e.constraints ?? {}).join(', '))
          .join('\n'),
    );
  }
  return validated;
}

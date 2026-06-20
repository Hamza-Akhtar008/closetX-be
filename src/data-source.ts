import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { OAuthAccount } from './auth/entities/oauth-account.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

/**
 * DataSource used by the TypeORM CLI (migration generate/run/revert).
 * Uses the DIRECT (non-pooler) Neon URL — PgBouncer pooling breaks migrations.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [Role, User, OAuthAccount, RefreshToken],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

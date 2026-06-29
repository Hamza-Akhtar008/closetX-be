import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { OAuthAccount } from './auth/entities/oauth-account.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { SellerVerification } from './seller-verification/entities/seller-verification.entity';
import { Listing } from './listings/entities/listing.entity';
import { Setting } from './settings/entities/setting.entity';
import { Banner } from './banners/entities/banner.entity';
import { EmailTemplate } from './email-templates/entities/email-template.entity';
import { Category } from './catalog/entities/category.entity';
import { Subcategory } from './catalog/entities/subcategory.entity';
import { Brand } from './catalog/entities/brand.entity';
import { SellerProfile } from './seller-profile/entities/seller-profile.entity';
import { BuyerProfile } from './account/entities/buyer-profile.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Address } from './orders/entities/address.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { Notification } from './notifications/entities/notification.entity';
import { WishlistItem } from './wishlist/entities/wishlist-item.entity';
import { Faq } from './faq/entities/faq.entity';
import { Dispute } from './disputes/entities/dispute.entity';

/**
 * DataSource used by the TypeORM CLI (migration generate/run/revert).
 * Uses the DIRECT (non-pooler) Neon URL — PgBouncer pooling breaks migrations.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [
    Role,
    User,
    OAuthAccount,
    RefreshToken,
    SellerVerification,
    Listing,
    Setting,
    Banner,
    EmailTemplate,
    Category,
    Subcategory,
    Brand,
    SellerProfile,
    BuyerProfile,
    CartItem,
    Address,
    Order,
    OrderItem,
    Notification,
    Dispute,
    WishlistItem,
    Faq,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

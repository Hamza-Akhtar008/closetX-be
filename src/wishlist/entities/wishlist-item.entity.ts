import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wishlist_items')
@Index('UQ_wishlist_user_listing', ['userId', 'listingId'], { unique: true })
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** One listing a user has added to their cart (unique items → no quantity). */
@Entity('cart_items')
@Index('UQ_cart_user_listing', ['userId', 'listingId'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'listing_id' })
  listingId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

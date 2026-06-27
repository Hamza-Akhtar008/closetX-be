import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ListingStatus =
  | 'DRAFT' // saved, never submitted (seller)
  | 'UNDER_REVIEW' // awaiting admin approval (system, on publish by unverified seller)
  | 'ACTIVE' // live in marketplace (seller publishes / admin approves)
  | 'PAUSED' // hidden from marketplace, seller can restore (seller pauses)
  | 'REJECTED'; // not visible, reason shown to seller (admin rejects)

/**
 * A seller listing. Photos are stored as private S3 object keys (JSON array in
 * `photoKeys`, first = cover); display URLs are minted on read via pre-signed
 * GET. Price is captured in USD; SAR is derived (×3.75) on read. Publish branch:
 * verified seller → ACTIVE, otherwise → UNDER_REVIEW (admin approves).
 */
@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ type: 'varchar', nullable: true })
  subcategory: string | null;

  @Column({ type: 'varchar', nullable: true })
  condition: string | null;

  @Column({ type: 'varchar', nullable: true })
  size: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ type: 'numeric', name: 'price_usd', default: 0 })
  priceUsd: number;

  @Column({ type: 'varchar', nullable: true, name: 'shipping_option' })
  shippingOption: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'dispatch_time' })
  dispatchTime: string | null;

  /** JSON array of { method, dispatchTime } — multiple shipping options. */
  @Column({ type: 'text', nullable: true, name: 'shipping_options' })
  shippingOptions: string | null;

  /** JSON array of private S3 object keys; first element is the cover. */
  @Column({ type: 'text', nullable: true, name: 'photo_keys' })
  photoKeys: string | null;

  @Index()
  @Column({ type: 'varchar', default: 'DRAFT' })
  status: ListingStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

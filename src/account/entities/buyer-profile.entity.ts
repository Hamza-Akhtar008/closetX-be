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

/** A buyer's account profile (identity, billing address, preferences). */
@Entity('buyer_profiles')
export class BuyerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  /** JSON string[] of taste tags. */
  @Column({ type: 'text', nullable: true, name: 'style_preferences' })
  stylePreferences: string | null;

  /** JSON { name, line1, line2, city, postalCode, country }. */
  @Column({ type: 'text', nullable: true, name: 'billing_address' })
  billingAddress: string | null;

  /** JSON { orderUpdates, priceDrops, newArrivals, sellerMessages, marketing }. */
  @Column({ type: 'text', nullable: true })
  notifications: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

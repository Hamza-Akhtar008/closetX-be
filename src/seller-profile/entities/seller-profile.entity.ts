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

/** A seller's public-facing profile (no "shop" entity — one per user). */
@Entity('seller_profiles')
export class SellerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  bio: string | null;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column({ type: 'text', nullable: true })
  mission: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  /** JSON { shipping, returns, authenticity }. */
  @Column({ type: 'text', nullable: true })
  policies: string | null;

  /** JSON { newOrders, offers, messages, payouts, marketing }. */
  @Column({ type: 'text', nullable: true })
  notifications: string | null;

  @Column({ type: 'boolean', default: false, name: 'vacation_mode' })
  vacationMode: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

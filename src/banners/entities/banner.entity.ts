import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BannerStatus = 'live' | 'scheduled' | 'paused';

@Entity('announcement_banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  text: string;

  @Column({ type: 'varchar', nullable: true })
  placement: string | null;

  @Column({ type: 'varchar', default: 'paused' })
  status: BannerStatus;

  /** Visual style key for the storefront/admin preview. */
  @Column({ type: 'varchar', nullable: true })
  tone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

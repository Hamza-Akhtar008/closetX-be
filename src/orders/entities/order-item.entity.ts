import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', nullable: true, name: 'listing_id' })
  listingId: string | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true })
  condition: string | null;

  @Column({ type: 'varchar', nullable: true })
  size: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'price_sar' })
  priceSar: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, name: 'price_usd' })
  priceUsd: string;

  @Column({ type: 'varchar', nullable: true, name: 'cover_key' })
  coverKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

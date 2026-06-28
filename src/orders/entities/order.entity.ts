import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus =
  | 'paid' // Payment Confirmed (on checkout)
  | 'confirmed' // Seller Notified & Confirmed
  | 'preparing' // Preparation
  | 'shipped' // Shipping Order Initiated
  | 'in_transit' // In Transit (carrier)
  | 'delivered' // Delivered to You
  | 'completed' // Delivery Confirmed → Order Closed
  | 'cancelled'
  | 'disputed';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'buyer_id' })
  buyerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Index()
  @Column({ type: 'uuid', name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ type: 'varchar', default: 'paid' })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  shipping: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  vat: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'varchar', default: 'standard', name: 'delivery_method' })
  deliveryMethod: string;

  @Column({ type: 'varchar', nullable: true, name: 'payment_method' })
  paymentMethod: string | null;

  /** JSON snapshot of the shipping address at checkout. */
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'timestamp', name: 'placed_at', default: () => 'now()' })
  placedAt: Date;

  @Column({ type: 'timestamp', name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamp', name: 'preparing_at', nullable: true })
  preparingAt: Date | null;

  @Column({ type: 'timestamp', name: 'shipped_at', nullable: true })
  shippedAt: Date | null;

  @Column({ type: 'timestamp', name: 'in_transit_at', nullable: true })
  inTransitAt: Date | null;

  @Column({ type: 'timestamp', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

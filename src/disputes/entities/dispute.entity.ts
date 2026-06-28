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
import { Order } from '../../orders/entities/order.entity';

export type DisputeReason =
  | 'not_received'
  | 'not_as_described'
  | 'wrong_item'
  | 'arrived_damaged';

export type DisputeStatus =
  | 'open' // submitted, seller has 48h to respond
  | 'escalated' // buyer escalated to ClosetX mediation
  | 'resolved' // decided in buyer's favour (refund)
  | 'rejected' // decided in seller's favour (no refund)
  | 'cancelled'; // buyer withdrew

export type DisputeOutcome = 'refund' | 'reject';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ type: 'uuid', name: 'buyer_id' })
  buyerId: string;

  @Column({ type: 'uuid', name: 'seller_id' })
  sellerId: string;

  @Column({ type: 'varchar' })
  reason: DisputeReason;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Index()
  @Column({ type: 'varchar', default: 'open' })
  status: DisputeStatus;

  /** JSON array of S3 keys for the buyer's photo evidence (max 5). */
  @Column({ type: 'text', nullable: true, name: 'photo_keys' })
  photoKeys: string | null;

  @Column({ type: 'text', nullable: true, name: 'seller_response' })
  sellerResponse: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'escalated_at' })
  escalatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ type: 'varchar', nullable: true })
  outcome: DisputeOutcome | null;

  /** 'seller' (voluntary refund) | 'admin'. */
  @Column({ type: 'varchar', nullable: true, name: 'resolved_by' })
  resolvedBy: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, name: 'refund_amount' })
  refundAmount: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;
}

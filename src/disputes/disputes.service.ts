import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { Dispute } from './entities/dispute.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';
import { S3Service } from '../common/storage/s3.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  SellerRespondDto,
} from './dto/dispute.dto';

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const SELLER_SLA_MS = 48 * 60 * 60 * 1000;
const ACTIVE = ['open', 'escalated'];

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(Dispute) private readonly repo: Repository<Dispute>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly s3: S3Service,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  private parsePhotos(d: Dispute): string[] {
    try {
      return d.photoKeys ? (JSON.parse(d.photoKeys) as string[]) : [];
    } catch {
      return [];
    }
  }

  async presignPhoto(userId: string, contentType: string) {
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const key = `disputes/${userId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.s3.createPresignedPutUrl(key, contentType);
    return { key, uploadUrl };
  }

  private async map(d: Dispute) {
    const order = await this.orders.findOne({ where: { id: d.orderId } });
    const its = await this.items.find({ where: { orderId: d.orderId } });
    const item = its[0];
    const buyer = await this.users.findOne({ where: { id: d.buyerId } });
    const seller = await this.users.findOne({ where: { id: d.sellerId } });
    const photoUrls = await Promise.all(this.parsePhotos(d).map((k) => this.s3.getSignedReadUrl(k)));
    return {
      id: d.id,
      caseNo: `DSP-${d.id.slice(0, 8).toUpperCase()}`,
      orderId: d.orderId,
      orderNo: `CX-${d.orderId.slice(0, 8).toUpperCase()}`,
      reason: d.reason,
      detail: d.detail,
      status: d.status,
      outcome: d.outcome,
      resolution: d.resolution,
      resolvedBy: d.resolvedBy,
      refundAmount: d.refundAmount != null ? Number(d.refundAmount) : null,
      sellerResponse: d.sellerResponse,
      respondedAt: d.respondedAt,
      escalatedAt: d.escalatedAt,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
      sellerSlaDeadline: new Date(d.createdAt.getTime() + SELLER_SLA_MS),
      photoUrls,
      buyerName: buyer ? buyer.fullName || buyer.email : 'Buyer',
      sellerName: seller ? seller.fullName || seller.email : 'Seller',
      orderTotal: order ? Number(order.total) : 0,
      orderStatus: order?.status ?? null,
      item: item
        ? {
            title: item.title,
            brand: item.brand,
            condition: item.condition,
            size: item.size,
            priceSar: Number(item.priceSar),
            coverUrl: item.coverKey ? await this.s3.getSignedReadUrl(item.coverKey) : null,
          }
        : null,
    };
  }

  // ───────────────────────────  Buyer  ───────────────────────────

  async create(buyerId: string, dto: CreateDisputeDto) {
    const order = await this.orders.findOne({ where: { id: dto.orderId, buyerId } });
    if (!order) throw new NotFoundException('orderNotFound');

    // Disputes open only AFTER the buyer confirms delivery, within 14 days.
    if (order.status !== 'delivered') {
      throw new BadRequestException('orderNotDisputable');
    }
    const base = order.deliveredAt ? new Date(order.deliveredAt).getTime() : Date.now();
    if (Date.now() - base > WINDOW_MS) {
      throw new BadRequestException('disputeWindowClosed');
    }
    const existing = await this.repo.findOne({
      where: { orderId: dto.orderId, status: In([...ACTIVE, 'resolved', 'rejected']) },
    });
    if (existing) throw new BadRequestException('disputeAlreadyExists');

    const dispute = await this.repo.save(
      this.repo.create({
        orderId: order.id,
        buyerId,
        sellerId: order.sellerId,
        reason: dto.reason as Dispute['reason'],
        detail: dto.detail,
        status: 'open',
        photoKeys: JSON.stringify(dto.photoKeys ?? []),
      }),
    );

    // Hold the order — it cannot close while disputed.
    order.status = 'disputed';
    await this.orders.save(order);

    // Notify the seller (push + email) — 48h to respond.
    const seller = await this.users.findOne({ where: { id: order.sellerId } });
    await this.notifications.create({
      userId: order.sellerId,
      type: 'dispute_opened',
      title: 'Dispute opened on your order ⚠️',
      body: 'A buyer opened a dispute. You have 48 hours to respond or issue a refund.',
      link: '/seller/disputes',
    });
    if (seller) {
      await this.mail.sendOrderEmail(
        seller.email,
        'Action needed: a dispute was opened',
        'A dispute was opened on your sale ⚠️',
        `${seller.fullName ?? ''}, a buyer opened a dispute. You have 48 hours to respond or issue a refund before it can be escalated to ClosetX mediation.`,
        [`Reason: ${dto.reason.replace(/_/g, ' ')}`, `Order: CX-${order.id.slice(0, 8).toUpperCase()}`],
        `${this.frontend()}/seller/disputes`,
        'Review the dispute',
      );
    }
    return this.map(dispute);
  }

  async listForBuyer(buyerId: string) {
    const rows = await this.repo.find({ where: { buyerId }, order: { createdAt: 'DESC' } });
    return Promise.all(rows.map((d) => this.map(d)));
  }

  async escalate(buyerId: string, id: string) {
    const d = await this.repo.findOne({ where: { id, buyerId } });
    if (!d) throw new NotFoundException('disputeNotFound');
    if (d.status !== 'open') throw new BadRequestException('cannotEscalate');
    d.status = 'escalated';
    d.escalatedAt = new Date();
    await this.repo.save(d);
    await this.notifications.create({
      userId: d.sellerId,
      type: 'dispute_escalated',
      title: 'Dispute escalated to ClosetX',
      body: 'The buyer escalated the dispute. A mediator will review the evidence.',
      link: '/seller/disputes',
    });
    return this.map(d);
  }

  async cancel(buyerId: string, id: string) {
    const d = await this.repo.findOne({ where: { id, buyerId } });
    if (!d) throw new NotFoundException('disputeNotFound');
    if (!ACTIVE.includes(d.status)) throw new BadRequestException('cannotCancel');
    d.status = 'cancelled';
    await this.repo.save(d);
    // Release the hold back to its delivered state.
    const order = await this.orders.findOne({ where: { id: d.orderId } });
    if (order && order.status === 'disputed') {
      order.status = order.deliveredAt ? 'delivered' : 'in_transit';
      await this.orders.save(order);
    }
    return this.map(d);
  }

  // ───────────────────────────  Seller  ───────────────────────────

  async listForSeller(sellerId: string) {
    const rows = await this.repo.find({ where: { sellerId }, order: { createdAt: 'DESC' } });
    return Promise.all(rows.map((d) => this.map(d)));
  }

  async sellerRespond(sellerId: string, id: string, dto: SellerRespondDto) {
    const d = await this.repo.findOne({ where: { id, sellerId } });
    if (!d) throw new NotFoundException('disputeNotFound');
    if (!ACTIVE.includes(d.status)) throw new BadRequestException('disputeClosed');
    d.sellerResponse = dto.message;
    d.respondedAt = new Date();
    await this.repo.save(d);
    await this.notifications.create({
      userId: d.buyerId,
      type: 'dispute_seller_responded',
      title: 'Seller responded to your dispute',
      body: 'The seller replied to your dispute. Review it in your Resolution Centre.',
      link: '/account/disputes',
    });
    return this.map(d);
  }

  /** Seller voluntarily issues a full refund — no strike. */
  async sellerRefund(sellerId: string, id: string) {
    const d = await this.repo.findOne({ where: { id, sellerId } });
    if (!d) throw new NotFoundException('disputeNotFound');
    if (!ACTIVE.includes(d.status)) throw new BadRequestException('disputeClosed');
    const order = await this.orders.findOne({ where: { id: d.orderId } });
    await this.resolveRefund(d, order, 'seller', order ? Number(order.total) : null, 'Seller issued a voluntary full refund.');
    await this.notifications.create({
      userId: d.buyerId,
      type: 'dispute_refunded',
      title: 'Refund issued 🎉',
      body: 'The seller issued a full refund for your dispute. Funds return to your original method.',
      link: '/account/disputes',
    });
    return this.map(d);
  }

  // ───────────────────────────  Admin  ───────────────────────────

  async adminList(status?: string) {
    const where = status && status !== 'all' ? { status: status as Dispute['status'] } : {};
    const rows = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    return Promise.all(rows.map((d) => this.map(d)));
  }

  async adminResolve(id: string, dto: ResolveDisputeDto) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('disputeNotFound');
    if (!ACTIVE.includes(d.status)) throw new BadRequestException('alreadyResolved');
    const order = await this.orders.findOne({ where: { id: d.orderId } });

    if (dto.decision === 'refund') {
      await this.resolveRefund(d, order, 'admin', dto.refundAmount ?? (order ? Number(order.total) : null), dto.resolution);
      // Admin-ruled refund → seller strike.
      await this.applyStrike(d.sellerId);
      await this.notifications.create({
        userId: d.buyerId,
        type: 'dispute_refunded',
        title: 'Dispute resolved · full refund 🎉',
        body: 'ClosetX ruled in your favour. Your refund is on its way to your original method.',
        link: '/account/disputes',
      });
    } else {
      d.status = 'rejected';
      d.outcome = 'reject';
      d.resolvedBy = 'admin';
      d.resolution = dto.resolution;
      d.resolvedAt = new Date();
      await this.repo.save(d);
      // Release held funds to seller — order completes.
      if (order) {
        order.status = 'completed';
        order.completedAt = new Date();
        await this.orders.save(order);
      }
      await this.notifications.create({
        userId: d.buyerId,
        type: 'dispute_rejected',
        title: 'Dispute closed',
        body: `Your dispute was not upheld. Reason: ${dto.resolution}`,
        link: '/account/disputes',
      });
      await this.notifications.create({
        userId: d.sellerId,
        type: 'dispute_won',
        title: 'Dispute resolved in your favour',
        body: 'The dispute was closed without refund — your payout is released.',
        link: '/seller/disputes',
      });
    }
    return this.map(d);
  }

  private async resolveRefund(
    d: Dispute,
    order: Order | null,
    by: 'seller' | 'admin',
    amount: number | null,
    resolution: string,
  ) {
    d.status = 'resolved';
    d.outcome = 'refund';
    d.resolvedBy = by;
    d.refundAmount = amount != null ? amount.toFixed(2) : null;
    d.resolution = resolution;
    d.resolvedAt = new Date();
    await this.repo.save(d);
    if (order) {
      // (No real gateway — refund is recorded; order moves to refunded.)
      order.status = 'refunded';
      await this.orders.save(order);
    }
  }

  /** Escalating seller penalties on admin-ruled refunds. */
  private async applyStrike(sellerId: string) {
    const seller = await this.users.findOne({ where: { id: sellerId } });
    if (!seller) return;
    seller.strikes = (seller.strikes ?? 0) + 1;

    let note = 'A formal warning has been recorded on your account.';
    if (seller.strikes >= 5) {
      seller.status = 'banned';
      note = 'Your account has been permanently banned after repeated lost disputes.';
    } else if (seller.strikes >= 3) {
      seller.status = 'suspended';
      note = 'Your account is suspended pending review.';
    } else if (seller.strikes === 2) {
      // 7-day listing freeze — system-pause all active listings.
      await this.listings.update({ userId: sellerId, status: 'ACTIVE' }, { status: 'PAUSED' });
      note = 'Your active listings were paused for 7 days (strike 2).';
    }
    await this.users.save(seller);

    await this.notifications.create({
      userId: sellerId,
      type: 'seller_strike',
      title: `Strike ${seller.strikes} added to your account`,
      body: note,
      link: '/seller',
    });
    await this.mail.sendOrderEmail(
      seller.email,
      `ClosetX: strike ${seller.strikes} on your seller account`,
      `Strike ${seller.strikes} recorded`,
      `${seller.fullName ?? ''}, a dispute was resolved against you. ${note}`,
      [`Total strikes: ${seller.strikes}`],
      `${this.frontend()}/seller`,
      'Review seller policy',
    );
  }

  // ───────────────────────────  Cron  ───────────────────────────

  /** Daily: auto-release delivered orders past the 14-day window that have no
   *  active dispute (escrow released to seller → order completed). */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoReleaseHeldOrders() {
    const cutoff = new Date(Date.now() - WINDOW_MS);
    // Delivered (buyer-confirmed) orders whose 14-day window has elapsed.
    const candidates = await this.orders.find({
      where: { status: 'delivered', deliveredAt: LessThan(cutoff) },
    });
    if (candidates.length === 0) return;
    const disputedOrderIds = new Set(
      (await this.repo.find({ where: { status: In(ACTIVE as Dispute['status'][]) } })).map((d) => d.orderId),
    );
    let released = 0;
    for (const order of candidates) {
      if (disputedOrderIds.has(order.id)) continue;
      order.status = 'completed';
      order.completedAt = new Date();
      await this.orders.save(order);
      await this.notifications.create({
        userId: order.sellerId,
        type: 'order_auto_released',
        title: 'Order auto-completed',
        body: 'The 14-day window passed with no dispute — your payout was released.',
        link: '/seller/orders',
      });
      released++;
    }
    this.logger.log(`Auto-released ${released} held order(s).`);
  }

  private frontend(): string {
    return process.env.FRONTEND_URL ?? 'http://localhost:3000';
  }
}

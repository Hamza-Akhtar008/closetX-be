import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Address } from './entities/address.entity';
import { Listing } from '../listings/entities/listing.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { User } from '../users/entities/user.entity';
import { S3Service } from '../common/storage/s3.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CheckoutDto } from './dto/checkout.dto';

const USD_TO_SAR = 3.75;
const VAT_RATE = 0.15;
const EXPRESS_FEE = 35;
const PROMOS: Record<string, number> = { WELCOME10: 10, CLOSET15: 15 };

type AddressSnapshot = {
  name: string;
  phone: string;
  street: string;
  apartment: string | null;
  region: string | null;
  city: string;
  postalCode: string | null;
  notes: string | null;
  lat: string | null;
  lng: string | null;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(CartItem) private readonly cart: Repository<CartItem>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly s3: S3Service,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private keys(l: Listing): string[] {
    try {
      return l.photoKeys ? (JSON.parse(l.photoKeys) as string[]) : [];
    } catch {
      return [];
    }
  }

  private frontend(): string {
    return this.config.get<string>('frontendUrl') ?? 'http://localhost:3000';
  }

  private async toResponse(order: Order, items: OrderItem[]) {
    const mappedItems = await Promise.all(
      items.map(async (i) => ({
        id: i.id,
        listingId: i.listingId,
        title: i.title,
        brand: i.brand,
        condition: i.condition,
        size: i.size,
        priceSar: Number(i.priceSar),
        priceUsd: Number(i.priceUsd),
        coverUrl: i.coverKey ? await this.s3.getSignedReadUrl(i.coverKey) : null,
      })),
    );
    let address: AddressSnapshot | null = null;
    try {
      address = order.address ? (JSON.parse(order.address) as AddressSnapshot) : null;
    } catch {
      address = null;
    }
    return {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shipping: Number(order.shipping),
      vat: Number(order.vat),
      total: Number(order.total),
      deliveryMethod: order.deliveryMethod,
      paymentMethod: order.paymentMethod,
      address,
      placedAt: order.placedAt,
      confirmedAt: order.confirmedAt,
      preparingAt: order.preparingAt,
      shippedAt: order.shippedAt,
      inTransitAt: order.inTransitAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      itemCount: mappedItems.length,
      items: mappedItems,
    };
  }

  // ───────────────────────────  Checkout  ───────────────────────────

  async checkout(buyerId: string, dto: CheckoutDto) {
    const buyer = await this.users.findOne({ where: { id: buyerId } });
    if (!buyer) throw new NotFoundException('userNotFound');
    if (!buyer.emailVerified) throw new ForbiddenException('emailNotVerified');
    if (buyer.status !== 'active') throw new ForbiddenException('accountInactive');

    // Resolve the shipping address
    let snapshot: AddressSnapshot;
    if (dto.addressId) {
      const a = await this.addresses.findOne({ where: { id: dto.addressId, userId: buyerId } });
      if (!a) throw new NotFoundException('addressNotFound');
      snapshot = this.snap(a);
    } else if (dto.address) {
      const m = dto.address;
      snapshot = {
        name: m.name,
        phone: m.phone,
        street: m.street,
        apartment: m.apartment ?? null,
        region: m.region ?? null,
        city: m.city,
        postalCode: m.postalCode ?? null,
        notes: m.notes ?? null,
        lat: m.lat ?? null,
        lng: m.lng ?? null,
      };
      if (dto.saveAddress) {
        const count = await this.addresses.count({ where: { userId: buyerId } });
        await this.addresses.save(
          this.addresses.create({ userId: buyerId, isDefault: count === 0, ...m }),
        );
      }
    } else {
      throw new BadRequestException('addressRequired');
    }

    // Load cart → purchasable listings (active, not own)
    const cartItems = await this.cart.find({ where: { userId: buyerId } });
    if (cartItems.length === 0) throw new BadRequestException('cartEmpty');
    const listings = await this.listings.find({
      where: { id: In(cartItems.map((c) => c.listingId)) },
      relations: { user: true },
    });
    const own = listings.filter((l) => l.userId === buyerId);
    const purchasable = listings.filter(
      (l) => l.status === 'ACTIVE' && l.userId !== buyerId,
    );
    if (purchasable.length === 0) {
      // Be specific about why nothing can be bought.
      if (own.length > 0) throw new BadRequestException('ownListings');
      throw new BadRequestException('noPurchasableItems');
    }

    const discountPct = dto.promoCode ? (PROMOS[dto.promoCode.toUpperCase()] ?? 0) : 0;

    // Group by seller → one order each
    const bySeller = new Map<string, Listing[]>();
    for (const l of purchasable) {
      const arr = bySeller.get(l.userId) ?? [];
      arr.push(l);
      bySeller.set(l.userId, arr);
    }

    const created: Order[] = [];
    for (const [sellerId, group] of bySeller) {
      const subtotal = group.reduce((s, l) => s + Number(l.priceUsd) * USD_TO_SAR, 0);
      const discount = Math.round((subtotal * discountPct) / 100);
      const shipping = dto.deliveryMethod === 'express' ? EXPRESS_FEE : 0;
      const vat = Math.round((subtotal - discount) * VAT_RATE * 100) / 100;
      const total = Math.round((subtotal - discount + shipping + vat) * 100) / 100;

      const order = await this.orders.save(
        this.orders.create({
          buyerId,
          sellerId,
          status: 'paid',
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          shipping: shipping.toFixed(2),
          vat: vat.toFixed(2),
          total: total.toFixed(2),
          deliveryMethod: dto.deliveryMethod,
          paymentMethod: dto.paymentMethod,
          address: JSON.stringify(snapshot),
          placedAt: new Date(),
        }),
      );
      const orderItems = group.map((l) => {
        const priceUsd = Number(l.priceUsd);
        return this.items.create({
          orderId: order.id,
          listingId: l.id,
          title: l.title,
          brand: l.brand,
          condition: l.condition,
          size: l.size,
          priceUsd: priceUsd.toFixed(2),
          priceSar: Math.round(priceUsd * USD_TO_SAR).toFixed(2),
          coverKey: this.keys(l)[0] ?? null,
        });
      });
      await this.items.save(orderItems);

      // Mark listings SOLD + drop from cart
      await this.listings.update({ id: In(group.map((l) => l.id)) }, { status: 'SOLD' });
      await this.cart.delete({ userId: buyerId, listingId: In(group.map((l) => l.id)) });

      created.push(order);
      await this.notifyOrderPlaced(order, group, buyer, sellerId);
    }

    const withItems = await Promise.all(
      created.map(async (o) => {
        const its = await this.items.find({ where: { orderId: o.id } });
        return this.toResponse(o, its);
      }),
    );
    return { orders: withItems };
  }

  private snap(a: Address): AddressSnapshot {
    return {
      name: a.name,
      phone: a.phone,
      street: a.street,
      apartment: a.apartment,
      region: a.region,
      city: a.city,
      postalCode: a.postalCode,
      notes: a.notes,
      lat: a.lat,
      lng: a.lng,
    };
  }

  private async notifyOrderPlaced(
    order: Order,
    listings: Listing[],
    buyer: User,
    sellerId: string,
  ) {
    const seller = await this.users.findOne({ where: { id: sellerId } });
    const titles = listings.map((l) => l.title);
    const rows = [
      ...listings.map((l) => `${l.brand ?? ''} ${l.title}`.trim()),
      `Total: SAR ${Number(order.total).toLocaleString('en-US')}`,
    ];

    // Buyer — confirmation
    await this.notifications.create({
      userId: buyer.id,
      type: 'order_placed',
      title: 'Order confirmed',
      body: `Your order for ${titles.join(', ')} is confirmed.`,
      link: `/account/orders`,
    });
    await this.mail.sendOrderEmail(
      buyer.email,
      'Your ClosetX order is confirmed',
      'Order confirmed 🎉',
      `Thanks ${buyer.fullName ?? ''}, your payment was successful and your order is placed.`,
      rows,
      `${this.frontend()}/account/orders`,
      'View your order',
    );

    // Seller — new sale
    if (seller) {
      await this.notifications.create({
        userId: seller.id,
        type: 'order_new',
        title: 'New sale 🎉',
        body: `${titles.join(', ')} sold — prepare it for dispatch.`,
        link: `/seller/orders`,
      });
      await this.mail.sendOrderEmail(
        seller.email,
        'You made a sale on ClosetX',
        'You made a sale! 🎉',
        `${seller.fullName ?? 'Hello'}, you have a new order to prepare.`,
        rows,
        `${this.frontend()}/seller/orders`,
        'Manage the order',
      );
    }
  }

  // ───────────────────────────  Buyer  ───────────────────────────

  async buyerOrders(buyerId: string) {
    const rows = await this.orders.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      rows.map(async (o) => {
        const its = await this.items.find({ where: { orderId: o.id } });
        const res = await this.toResponse(o, its);
        const seller = await this.users.findOne({ where: { id: o.sellerId } });
        return { ...res, counterpart: seller ? seller.fullName || seller.email : 'Seller' };
      }),
    );
  }

  async markReceived(buyerId: string, id: string) {
    const order = await this.orders.findOne({ where: { id, buyerId } });
    if (!order) throw new NotFoundException('orderNotFound');
    if (!['in_transit', 'delivered'].includes(order.status)) {
      throw new BadRequestException('onlyAfterTransit');
    }
    const now = new Date();
    if (!order.deliveredAt) order.deliveredAt = now;
    order.status = 'completed';
    order.completedAt = now;
    await this.orders.save(order);

    await this.notifications.create({
      userId: order.sellerId,
      type: 'order_completed',
      title: 'Delivery confirmed 🎉',
      body: 'The buyer confirmed delivery — your payout is released from escrow.',
      link: `/seller/orders`,
    });
    const its = await this.items.find({ where: { orderId: order.id } });
    return this.toResponse(order, its);
  }

  // ───────────────────────────  Seller  ───────────────────────────

  async sellerOrders(sellerId: string) {
    const rows = await this.orders.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      rows.map(async (o) => {
        const its = await this.items.find({ where: { orderId: o.id } });
        const res = await this.toResponse(o, its);
        const buyer = await this.users.findOne({ where: { id: o.buyerId } });
        return { ...res, counterpart: buyer ? buyer.fullName || buyer.email : 'Buyer' };
      }),
    );
  }

  async updateStatus(
    sellerId: string,
    id: string,
    status: 'confirmed' | 'preparing' | 'shipped' | 'in_transit' | 'delivered',
  ) {
    const order = await this.orders.findOne({ where: { id, sellerId } });
    if (!order) throw new NotFoundException('orderNotFound');

    // Forward-only chain — each step must be the immediate next.
    const chain: OrderStatus[] = [
      'paid',
      'confirmed',
      'preparing',
      'shipped',
      'in_transit',
      'delivered',
    ];
    if (chain.indexOf(status) !== chain.indexOf(order.status) + 1) {
      throw new BadRequestException('invalidStatusTransition');
    }
    const tsField: Record<string, keyof Order> = {
      confirmed: 'confirmedAt',
      preparing: 'preparingAt',
      shipped: 'shippedAt',
      in_transit: 'inTransitAt',
      delivered: 'deliveredAt',
    };
    order.status = status;
    (order[tsField[status]] as Date) = new Date();
    await this.orders.save(order);

    const labels: Record<string, { title: string; body: string }> = {
      confirmed: { title: 'Seller confirmed your order', body: 'The seller accepted your order and will prepare it.' },
      preparing: { title: 'Your order is being prepared', body: 'The seller is preparing your piece for shipment.' },
      shipped: { title: 'Shipping initiated 📦', body: 'A shipping label was created for your order.' },
      in_transit: { title: 'Your order is on its way 🚚', body: 'Your order is in transit with the carrier.' },
      delivered: { title: 'Your order was delivered 🎉', body: 'Confirm delivery to release the payment from escrow.' },
    };
    await this.notifications.create({
      userId: order.buyerId,
      type: `order_${status}`,
      title: labels[status].title,
      body: labels[status].body,
      link: `/account/orders`,
    });
    if (status === 'in_transit' || status === 'delivered') {
      const buyer = await this.users.findOne({ where: { id: order.buyerId } });
      if (buyer) {
        await this.mail.sendOrderEmail(
          buyer.email,
          status === 'delivered' ? 'Your ClosetX order was delivered' : 'Your ClosetX order is on its way',
          labels[status].title,
          `${buyer.fullName ?? ''}, ${labels[status].body}`,
          [`Total: SAR ${Number(order.total).toLocaleString('en-US')}`],
          `${this.frontend()}/account/orders`,
          status === 'delivered' ? 'Confirm delivery' : 'Track your order',
        );
      }
    }
    const its = await this.items.find({ where: { orderId: order.id } });
    return this.toResponse(order, its);
  }
}

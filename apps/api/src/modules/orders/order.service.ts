import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { db, Prisma, OrderStatus } from '@mitti/database';
import { calculateTotals, GIFT_WRAP_PRICE, personalizationPrice, assertTransition } from '@mitti/commerce';
import type { CheckoutInput } from '@mitti/validation';
import { tokenHash } from '../auth/auth.service';
import { randomBytes, randomUUID } from 'node:crypto';
import { MockPaymentProvider, RazorpayProvider, PaymentProvider } from '@mitti/integrations';
import type { RequestContext } from '../../common/http';
export const orderInclude = {
  items: true,
  addresses: true,
  events: { orderBy: { createdAt: 'asc' as const } },
  payments: true,
  shipments: true,
};
@Injectable()
export class OrderService {
  readonly provider: PaymentProvider =
    process.env.PAYMENT_PROVIDER === 'razorpay'
      ? new RazorpayProvider(
          process.env.RAZORPAY_KEY_ID!,
          process.env.RAZORPAY_KEY_SECRET!,
          process.env.RAZORPAY_WEBHOOK_SECRET!,
        )
      : new MockPaymentProvider();
  async checkout(req: RequestContext, input: CheckoutInput) {
    const cartToken = tokenHash(req.cookies.mitti_cart || '');
    const requestHash = tokenHash(JSON.stringify({ ...input, cartToken }));
    const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new ConflictException('This checkout key has already been used');
      return { order: await this.get(existing.id, req), reused: true };
    }
    const accessToken = randomBytes(32).toString('hex');
    const order = await db.$transaction(
      async (tx) => {
        const cart = await tx.cart.findUnique({
          where: { tokenHash: cartToken },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: { include: { images: { orderBy: { position: 'asc' } }, customizations: true } },
                  },
                },
              },
            },
          },
        });
        if (!cart?.items.length) throw new BadRequestException('Your bag is empty');
        let subtotal = 0;
        const lines = [];
        // A stable lock order avoids deadlocks when carts share multiple variants.
        for (const item of [...cart.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
          const variant = item.variant,
            product = variant.product;
          if (!variant.active || product.status !== 'PUBLISHED' || product.deletedAt)
            throw new BadRequestException(`${product.title} is unavailable`);
          let extra = 0;
          try {
            extra = personalizationPrice(
              product.customizations,
              item.customization as Record<string, string>,
            );
          } catch (error) {
            throw new BadRequestException((error as Error).message);
          }
          const reservation = await tx.inventory.updateMany({
            where: { variantId: variant.id, available: { gte: item.quantity } },
            data: { available: { decrement: item.quantity }, reserved: { increment: item.quantity } },
          });
          if (!reservation.count) throw new ConflictException(`${product.title} does not have enough stock`);
          const unitPrice = variant.price + extra + (item.giftWrap ? GIFT_WRAP_PRICE : 0);
          subtotal += unitPrice * item.quantity;
          lines.push({
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            variantName: variant.name,
            image: product.images[0]?.url || '',
            sku: variant.sku,
            quantity: item.quantity,
            unitPrice,
            customization: item.customization as Prisma.InputJsonValue,
            giftWrap: item.giftWrap,
          });
        }
        const coupon = input.coupon
          ? await tx.coupon.findUnique({ where: { code: input.coupon.toUpperCase() } })
          : null;
        if (
          input.coupon &&
          (!coupon ||
            !coupon.active ||
            (coupon.expiresAt && coupon.expiresAt < new Date()) ||
            (coupon.maxUses && coupon.used >= coupon.maxUses))
        )
          throw new BadRequestException('This coupon is not available');
        let totals;
        try {
          totals = calculateTotals(subtotal, coupon || undefined, {
            flat: Number(process.env.SHIPPING_FLAT_PAISE || 9900),
            freeAbove: Number(process.env.SHIPPING_FREE_ABOVE_PAISE || 250000),
          });
        } catch (error) {
          throw new BadRequestException((error as Error).message);
        }
        if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { used: { increment: 1 } } });
        const created = await tx.order.create({
          data: {
            number: `MT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
            userId: req.user?.id,
            email: input.email,
            accessTokenHash: tokenHash(accessToken),
            idempotencyKey: input.idempotencyKey,
            requestHash,
            ...totals,
            couponId: coupon?.id,
            reservationExpiresAt: new Date(
              Date.now() + Number(process.env.RESERVATION_MINUTES || 20) * 60000,
            ),
            items: { create: lines },
            addresses: {
              create: [
                { ...input.address, kind: 'SHIPPING' },
                { ...input.address, kind: 'BILLING' },
              ],
            },
            events: { create: { type: 'ORDER_CREATED', actorId: req.user?.id } },
          },
          include: orderInclude,
        });
        for (const line of lines) {
          const inventory = await tx.inventory.findUniqueOrThrow({ where: { variantId: line.variantId } });
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inventory.id,
              type: 'RESERVE',
              quantity: line.quantity,
              orderId: created.id,
            },
          });
        }
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.outboxEvent.create({
          data: {
            type: 'email',
            payload: {
              to: input.email,
              subject: `Your order ${created.number}`,
              text: `Thank you for choosing handmade. Your order is reserved for 20 minutes. Complete payment from your order page.`,
            },
          },
        });
        return created;
      },
      { isolationLevel: 'Serializable', timeout: 15000 },
    );
    return { order: this.safe(order), accessToken };
  }
  safe<T extends { accessTokenHash: string; requestHash: string; idempotencyKey: string }>(order: T) {
    const { accessTokenHash: _a, requestHash: _b, idempotencyKey: _c, ...safe } = order;
    return safe;
  }
  async get(id: string, req: RequestContext) {
    const order = await db.order.findUnique({ where: { id }, include: orderInclude });
    const staff = req.user?.permissions.some((p) => p === '*' || p === 'orders:read');
    const guest = req.cookies[`mitti_order_${id}`];
    if (
      !order ||
      !(
        staff ||
        (req.user?.id && order.userId === req.user.id) ||
        (guest && tokenHash(guest) === order.accessTokenHash)
      )
    )
      throw new NotFoundException('Order not found');
    return this.safe(order);
  }
  async createPayment(id: string, req: RequestContext) {
    await this.get(id, req);
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    if (
      order.status !== 'PENDING_PAYMENT' ||
      !order.reservationExpiresAt ||
      order.reservationExpiresAt < new Date()
    )
      throw new ConflictException('This reservation has expired or the order is already paid');
    const existing = order.payments[0];
    if (existing)
      return {
        provider: this.provider.name,
        providerOrderId: existing.providerOrderId,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.total,
        currency: order.currency,
      };
    const result = await this.provider.createPayment({
      orderId: id,
      amount: order.total,
      currency: order.currency,
    });
    await db.payment.create({
      data: {
        orderId: id,
        provider: this.provider.name,
        providerOrderId: result.id,
        amount: order.total,
        currency: order.currency,
      },
    });
    return {
      provider: this.provider.name,
      providerOrderId: result.id,
      keyId: result.keyId,
      amount: order.total,
      currency: order.currency,
    };
  }
  async capture(
    providerOrderId: string,
    providerPaymentId: string,
    amount: number,
    currency: string,
    eventId: string,
  ) {
    return db.$transaction(
      async (tx) => {
        if (await tx.paymentTransaction.findUnique({ where: { eventId } })) return { duplicate: true };
        const payment = await tx.payment.findUnique({
          where: { providerOrderId },
          include: { order: { include: { items: true } } },
        });
        if (!payment) throw new NotFoundException('Unknown payment');
        if (amount !== payment.amount || currency !== payment.currency)
          throw new BadRequestException('Payment amount or currency does not match');
        if (payment.status === 'CAPTURED') return { duplicate: true };
        const order = payment.order;
        if (order.status !== 'PENDING_PAYMENT')
          throw new ConflictException('Order is no longer payable; reconciliation required');
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            reservationExpiresAt: null,
            events: { create: { type: 'PAYMENT_RECEIVED' } },
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CAPTURED',
            providerPaymentId,
            transactions: { create: { eventId, type: 'CAPTURE', amount } },
          },
        });
        for (const line of order.items) {
          const inventory = await tx.inventory.update({
            where: { variantId: line.variantId },
            data: { reserved: { decrement: line.quantity }, sold: { increment: line.quantity } },
          });
          await tx.inventoryTransaction.create({
            data: { inventoryId: inventory.id, type: 'SALE', quantity: line.quantity, orderId: order.id },
          });
        }
        await tx.outboxEvent.create({
          data: {
            type: 'email',
            payload: {
              to: order.email,
              subject: `Payment received · ${order.number}`,
              text: 'Your order is confirmed. Our makers will prepare your pieces with care.',
            },
          },
        });
        await tx.analyticsEvent.create({
          data: { type: 'purchase_completed', metadata: { orderId: order.id, amount: order.total } },
        });
        return { paid: true };
      },
      { isolationLevel: 'Serializable' },
    );
  }
  async transition(id: string, status: OrderStatus, actorId: string, trackingNumber?: string) {
    return db.$transaction(
      async (tx) => {
        const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
        try {
          assertTransition(order.status, status);
        } catch (error) {
          throw new BadRequestException((error as Error).message);
        }
        if (['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(status))
          throw new BadRequestException('Payment state must be updated by the payment service');
        if (status === 'CANCELLED' && order.status !== 'PENDING_PAYMENT')
          throw new BadRequestException('Paid orders require a payment refund before cancellation');
        if (status === 'SHIPPED' && !trackingNumber)
          throw new BadRequestException('Add a tracking number before shipping');
        if (status === 'CANCELLED') {
          for (const item of order.items) {
            const inventory = await tx.inventory.update({
              where: { variantId: item.variantId },
              data: { reserved: { decrement: item.quantity }, available: { increment: item.quantity } },
            });
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                type: 'RELEASE',
                quantity: item.quantity,
                orderId: id,
                actorId,
              },
            });
          }
          if (order.couponId)
            await tx.coupon.update({ where: { id: order.couponId }, data: { used: { decrement: 1 } } });
        }
        const updated = await tx.order.update({
          where: { id },
          data: {
            status,
            reservationExpiresAt: null,
            events: { create: { type: status, actorId } },
            ...(status === 'SHIPPED' ? { shipments: { create: { trackingNumber: trackingNumber! } } } : {}),
          },
          include: orderInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'ORDER_STATUS_CHANGED',
            resource: 'order',
            resourceId: id,
            metadata: { from: order.status, to: status },
          },
        });
        await tx.outboxEvent.create({
          data: {
            type: 'email',
            payload: {
              to: order.email,
              subject: `An update on ${order.number}`,
              text: `Your order is now ${status.toLowerCase().replaceAll('_', ' ')}.`,
            },
          },
        });
        return this.safe(updated);
      },
      { isolationLevel: 'Serializable' },
    );
  }
  async expire() {
    const expired = await db.order.findMany({
      where: { status: 'PENDING_PAYMENT', reservationExpiresAt: { lt: new Date() } },
      take: 100,
    });
    for (const order of expired) {
      try {
        await this.transition(order.id, 'CANCELLED', 'system');
      } catch (error) {
        if (
          !(error instanceof BadRequestException) &&
          !(error instanceof Prisma.PrismaClientKnownRequestError)
        )
          throw error;
      }
    }
  }
  async mockComplete(id: string, req: RequestContext) {
    if (this.provider.name !== 'mock' || process.env.NODE_ENV === 'production') throw new NotFoundException();
    const order = await this.get(id, req);
    const payment = await this.createPayment(id, req);
    return this.capture(
      payment.providerOrderId,
      `mock_paid_${randomUUID()}`,
      order.total,
      order.currency,
      `mock_event_${payment.providerOrderId}`,
    );
  }
}

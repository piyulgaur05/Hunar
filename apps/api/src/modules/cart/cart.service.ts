import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@mitti/database';
import { GIFT_WRAP_PRICE, personalizationPrice } from '@mitti/commerce';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { tokenHash } from '../auth/auth.service';
import type { RequestContext } from '../../common/http';
@Injectable()
export class CartService {
  async resolve(req: RequestContext, res?: Response) {
    const token = req.cookies.mitti_cart;
    let cart = token ? await db.cart.findUnique({ where: { tokenHash: tokenHash(token) } }) : null;
    if (!cart && res) {
      const fresh = randomBytes(32).toString('hex');
      cart = await db.cart.create({ data: { tokenHash: tokenHash(fresh) } });
      res.cookie('mitti_cart', fresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 86400000,
      });
      req.cookies.mitti_cart = fresh;
    }
    return cart;
  }
  async get(req: RequestContext, res?: Response) {
    const cart = await this.resolve(req, res);
    if (!cart) return { id: null, items: [], subtotal: 0 };
    const items = await db.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: {
            inventory: true,
            product: { include: { images: { orderBy: { position: 'asc' } }, customizations: true } },
          },
        },
      },
    });
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (item.variant.price +
          personalizationPrice(
            item.variant.product.customizations,
            item.customization as Record<string, string>,
          ) +
          (item.giftWrap ? GIFT_WRAP_PRICE : 0)) *
          item.quantity,
      0,
    );
    return { ...cart, tokenHash: undefined, items, subtotal };
  }
  async add(
    req: RequestContext,
    res: Response,
    input: { variantId: string; quantity: number; customization: Record<string, string>; giftWrap: boolean },
  ) {
    const cart = await this.resolve(req, res);
    const variant = await db.productVariant.findUnique({
      where: { id: input.variantId },
      include: { inventory: true, product: { include: { customizations: true } } },
    });
    if (!variant || !variant.active || variant.product.status !== 'PUBLISHED' || variant.product.deletedAt)
      throw new NotFoundException('This piece is no longer available');
    if ((variant.inventory?.available || 0) < input.quantity)
      throw new BadRequestException('There are not enough pieces in stock');
    try {
      personalizationPrice(variant.product.customizations, input.customization);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    await db.cartItem.create({ data: { cartId: cart!.id, ...input } });
    return this.get(req);
  }
  async update(req: RequestContext, id: string, quantity: number) {
    const cart = await this.resolve(req);
    if (!cart) throw new NotFoundException();
    const item = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item) throw new NotFoundException();
    if (quantity > (item.variant.inventory?.available || 0))
      throw new BadRequestException('There are not enough pieces in stock');
    if (quantity === 0) await db.cartItem.delete({ where: { id } });
    else await db.cartItem.update({ where: { id }, data: { quantity } });
    return this.get(req);
  }
}

import { Body, Controller, Delete, Get, Post, Patch, Param, Req, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { db } from '@mitti/database';
import { addressSchema, email } from '@mitti/validation';
import { productInclude } from '../catalog/catalog.service';
import { ok, parse, Require, RequestContext } from '../../common/http';
@Controller()
export class CustomerController {
  @Get('customers/me') @Require() me(@Req() req: RequestContext) {
    return ok(req.user);
  }
  @Patch('customers/me') @Require() async profile(@Req() req: RequestContext, @Body() body: unknown) {
    const data = parse(
      z.object({ name: z.string().min(2).max(100), newsletter: z.boolean() }).strict(),
      body,
    );
    return ok(
      await db.user.update({
        where: { id: req.user!.id },
        data: {
          name: data.name,
          profile: {
            upsert: {
              create: { preferences: { newsletter: data.newsletter } },
              update: { preferences: { newsletter: data.newsletter } },
            },
          },
        },
        select: { id: true, name: true, email: true },
      }),
    );
  }
  @Get('addresses') @Require() async addresses(@Req() req: RequestContext) {
    return ok(await db.address.findMany({ where: { userId: req.user!.id } }));
  }
  @Post('addresses') @Require() async address(@Req() req: RequestContext, @Body() body: unknown) {
    return ok(await db.address.create({ data: { ...parse(addressSchema, body), userId: req.user!.id } }));
  }
  @Delete('addresses/:id') @Require() async deleteAddress(
    @Req() req: RequestContext,
    @Param('id') id: string,
  ) {
    return ok(await db.address.deleteMany({ where: { id: z.uuid().parse(id), userId: req.user!.id } }));
  }
  @Get('wishlist') @Require() async wishlist(@Req() req: RequestContext) {
    return ok(
      (
        await db.wishlistItem.findMany({
          where: { userId: req.user!.id, product: { status: 'PUBLISHED', deletedAt: null } },
          include: { product: { include: productInclude } },
        })
      ).map((i) => i.product),
    );
  }
  @Post('wishlist/:id') @Require() async wish(@Req() req: RequestContext, @Param('id') id: string) {
    const productId = z.uuid().parse(id);
    await db.product.findFirstOrThrow({ where: { id: productId, status: 'PUBLISHED', deletedAt: null } });
    return ok(
      await db.wishlistItem.upsert({
        where: { userId_productId: { userId: req.user!.id, productId } },
        update: {},
        create: { userId: req.user!.id, productId },
      }),
    );
  }
  @Delete('wishlist/:id') @Require() async unwish(@Req() req: RequestContext, @Param('id') id: string) {
    return ok(
      await db.wishlistItem.deleteMany({ where: { userId: req.user!.id, productId: z.uuid().parse(id) } }),
    );
  }
  @Post('reviews') @Require() async review(@Req() req: RequestContext, @Body() body: unknown) {
    const data = parse(
      z
        .object({
          productId: z.uuid(),
          rating: z.number().int().min(1).max(5),
          title: z.string().min(3).max(100),
          body: z.string().min(10).max(2000),
        })
        .strict(),
      body,
    );
    if (
      !(await db.orderItem.findFirst({
        where: { productId: data.productId, order: { userId: req.user!.id, status: 'DELIVERED' } },
      }))
    )
      throw new BadRequestException('You can review this piece after your order is delivered');
    return ok(await db.review.create({ data: { ...data, userId: req.user!.id } }));
  }
  @Get('notifications') @Require() async notifications(@Req() req: RequestContext) {
    return ok(
      await db.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  }
  @Post('newsletter') async newsletter(@Body() body: unknown) {
    const data = parse(z.object({ email }).strict(), body);
    await db.newsletterSubscription.upsert({ where: { email: data.email }, update: {}, create: data });
    return ok({ message: 'You’re on the list. A thoughtful letter will be on its way.' });
  }
  @Post('events') async event(@Body() body: unknown) {
    const data = parse(
      z
        .object({
          type: z.enum([
            'product_view',
            'search',
            'add_to_cart',
            'checkout_started',
            'wishlist_added',
            'coupon_used',
          ]),
          productId: z.uuid().optional(),
          anonymousId: z.string().max(100).optional(),
        })
        .strict(),
      body,
    );
    await db.analyticsEvent.create({ data });
    return ok({ accepted: true });
  }
}

import { Body, Controller, Get, Post, Inject, Req, Res, Param, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { Response } from 'express';
import { db } from '@mitti/database';
import { checkoutSchema } from '@mitti/validation';
import { OrderService, orderInclude } from './order.service';
import { ok, parse, Require, RequestContext } from '../../common/http';
@Controller()
export class OrderController {
  constructor(@Inject(OrderService) private readonly orders: OrderService) {}
  @Post('checkout') async checkout(
    @Body() body: unknown,
    @Req() req: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.orders.checkout(req, parse(checkoutSchema, body));
    if (result.accessToken)
      res.cookie(`mitti_order_${result.order.id}`, result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 86400000,
      });
    return ok(result.order);
  }
  @Get('orders') @Require() async mine(@Req() req: RequestContext) {
    return ok(
      (
        await db.order.findMany({
          where: { userId: req.user!.id },
          include: orderInclude,
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      ).map((o) => this.orders.safe(o)),
    );
  }
  @Get('orders/:id') async get(@Param('id') id: string, @Req() req: RequestContext) {
    return ok(await this.orders.get(z.uuid().parse(id), req));
  }
  @Post('orders/:id/payment') async payment(@Param('id') id: string, @Req() req: RequestContext) {
    return ok(await this.orders.createPayment(z.uuid().parse(id), req));
  }
  @Post('orders/:id/mock-payment') async mock(@Param('id') id: string, @Req() req: RequestContext) {
    return ok(await this.orders.mockComplete(z.uuid().parse(id), req));
  }
  @Post('payments/webhook') async webhook(@Req() req: RequestContext & { rawBody?: Buffer }) {
    const signature = req.headers['x-razorpay-signature'];
    if (
      this.orders.provider.name !== 'razorpay' ||
      typeof signature !== 'string' ||
      !req.rawBody ||
      !this.orders.provider.verifyPayment(req.rawBody, signature)
    )
      throw new BadRequestException('Invalid webhook signature');
    const event = z
      .object({
        event: z.string(),
        payload: z.object({
          payment: z.object({
            entity: z.object({
              id: z.string(),
              order_id: z.string(),
              amount: z.number().int(),
              currency: z.string(),
              status: z.string(),
            }),
          }),
        }),
      })
      .parse(req.body);
    if (event.event !== 'payment.captured' || event.payload.payment.entity.status !== 'captured')
      return ok({ ignored: true });
    const p = event.payload.payment.entity;
    const eventId = req.headers['x-razorpay-event-id'];
    if (typeof eventId !== 'string') throw new BadRequestException('Missing event ID');
    return ok(await this.orders.capture(p.order_id, p.id, p.amount, p.currency, eventId));
  }
}

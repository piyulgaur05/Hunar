import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { cartItemSchema } from '@mitti/validation';
import { CartService } from './cart.service';
import { ok, parse, RequestContext } from '../../common/http';
@Controller('cart')
export class CartController {
  constructor(@Inject(CartService) private readonly cart: CartService) {}
  @Get() async get(@Req() req: RequestContext, @Res({ passthrough: true }) res: Response) {
    return ok(await this.cart.get(req, res));
  }
  @Post('items') async add(
    @Req() req: RequestContext,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    return ok(await this.cart.add(req, res, parse(cartItemSchema, body)));
  }
  @Patch('items/:id') async update(
    @Req() req: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return ok(
      await this.cart.update(
        req,
        z.uuid().parse(id),
        parse(z.object({ quantity: z.number().int().min(0).max(20) }).strict(), body).quantity,
      ),
    );
  }
  @Delete('items/:id') async remove(@Req() req: RequestContext, @Param('id') id: string) {
    return ok(await this.cart.update(req, z.uuid().parse(id), 0));
  }
}

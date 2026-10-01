import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { db, OrderStatus } from '@mitti/database';
import { productSchema, sectionSchema, couponSchema } from '@mitti/validation';
import { ok, parse, Require, RequestContext } from '../../common/http';
import { CatalogService } from '../catalog/catalog.service';
import { OrderService, orderInclude } from '../orders/order.service';
import { AdminService } from './admin.service';
@ApiTags('Operations')
@Controller('admin')
@Require()
export class AdminController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(OrderService) private readonly orders: OrderService,
    @Inject(AdminService) private readonly admin: AdminService,
  ) {}
  @Get('dashboard') @Require('analytics:read') async dashboard() {
    return ok(await this.admin.dashboard());
  }
  @Get('products') @Require('products:read') async products(@Query() query: Record<string, string>) {
    const { products, ...meta } = await this.catalog.list(query, true);
    return ok(products, meta);
  }
  @Get('products/:id') @Require('products:read') async product(@Param('id') id: string) {
    return ok(await this.catalog.get(id, true));
  }
  @Post('products') @Require('products:create') async create(
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    return ok(await this.catalog.save(parse(productSchema, body), req.user!.id));
  }
  @Patch('products/:id') @Require('products:update') async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    return ok(await this.catalog.save(parse(productSchema, body), req.user!.id, z.uuid().parse(id)));
  }
  @Delete('products/:id') @Require('products:delete') async archive(
    @Param('id') id: string,
    @Req() req: RequestContext,
  ) {
    return ok(await this.catalog.archive(z.uuid().parse(id), req.user!.id));
  }
  @Get('orders') @Require('orders:read') async listOrders(@Query() query: Record<string, string>) {
    const page = Math.max(1, Number(query.page) || 1);
    const status = query.status ? z.enum(OrderStatus).parse(query.status) : undefined;
    const where = {
      ...(status ? { status } : {}),
      ...(query.q
        ? {
            OR: [
              { number: { contains: query.q, mode: 'insensitive' as const } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: (page - 1) * 20,
      }),
      db.order.count({ where }),
    ]);
    return ok(
      items.map((o) => this.orders.safe(o)),
      { total, page, pages: Math.ceil(total / 20) },
    );
  }
  @Patch('orders/:id/status') @Require('orders:update') async status(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const data = parse(
      z
        .object({ status: z.enum(OrderStatus), trackingNumber: z.string().min(3).max(100).optional() })
        .strict(),
      body,
    );
    return ok(
      await this.orders.transition(z.uuid().parse(id), data.status, req.user!.id, data.trackingNumber),
    );
  }
  @Get('customers') @Require('customers:read') async customers(@Query('q') q = '') {
    return ok(
      await db.user.findMany({
        where: {
          roles: { none: {} },
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { name: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          verifiedAt: true,
          disabledAt: true,
          _count: { select: { orders: true } },
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
  @Get('inventory') @Require('products:read') async inventory() {
    return ok(
      await db.inventory.findMany({
        include: { variant: { include: { product: { select: { title: true, images: true } } } } },
        orderBy: { available: 'asc' },
        take: 200,
      }),
    );
  }
  @Patch('inventory/:id') @Require('inventory:update') async stock(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const data = parse(
      z
        .object({ adjustment: z.number().int().min(-100000).max(100000), reason: z.string().min(3).max(200) })
        .strict(),
      body,
    );
    return ok(
      await db.$transaction(
        async (tx) => {
          const current = await tx.inventory.findUniqueOrThrow({ where: { id: z.uuid().parse(id) } });
          if (current.available + data.adjustment < 0)
            throw new BadRequestException('Stock cannot be negative');
          const updated = await tx.inventory.update({
            where: { id },
            data: {
              available: { increment: data.adjustment },
              transactions: {
                create: { type: 'ADJUSTMENT', quantity: data.adjustment, actorId: req.user!.id },
              },
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: req.user!.id,
              action: 'STOCK_ADJUSTED',
              resource: 'inventory',
              resourceId: id,
              metadata: data,
            },
          });
          return updated;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }
  @Get('content') @Require('content:update') async content() {
    return ok(await db.homepageSection.findMany({ orderBy: { position: 'asc' } }));
  }
  @Patch('content/:id') @Require('content:update') async saveContent(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const data = parse(sectionSchema, body);
    return ok(
      await db.$transaction(async (tx) => {
        const section = await tx.homepageSection.update({ where: { id: z.uuid().parse(id) }, data });
        await tx.auditLog.create({
          data: { actorId: req.user!.id, action: 'CONTENT_UPDATED', resource: 'homepage', resourceId: id },
        });
        return section;
      }),
    );
  }
  @Get('promotions') @Require('promotions:update') async coupons() {
    return ok(await db.coupon.findMany());
  }
  @Post('promotions') @Require('promotions:update') async coupon(
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const coupon = await db.coupon.create({ data: parse(couponSchema, body) });
    await this.admin.audit(req.user!.id, 'COUPON_CREATED', 'coupon', coupon.id);
    return ok(coupon);
  }
  @Patch('promotions/:id') @Require('promotions:update') async couponUpdate(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const coupon = await db.coupon.update({
      where: { id: z.uuid().parse(id) },
      data: parse(couponSchema, body),
    });
    await this.admin.audit(req.user!.id, 'COUPON_UPDATED', 'coupon', coupon.id);
    return ok(coupon);
  }
  @Get('reviews') @Require('reviews:update') async reviews() {
    return ok(
      await db.review.findMany({
        include: { user: { select: { name: true } }, product: { select: { title: true } } },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
  @Patch('reviews/:id') @Require('reviews:update') async review(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const review = await db.review.update({
      where: { id: z.uuid().parse(id) },
      data: parse(z.object({ approved: z.boolean() }).strict(), body),
    });
    await this.admin.audit(req.user!.id, 'REVIEW_MODERATED', 'review', review.id);
    return ok(review);
  }
  @Get('audit') @Require('audit:read') async audit() {
    return ok(await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
  }
  @Get('settings') @Require('settings:update') async settings() {
    return ok(await db.siteSetting.findMany());
  }
  @Patch('settings/:key') @Require('settings:update') async setting(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() req: RequestContext,
  ) {
    const { value } = parse(z.object({ value: z.string().max(3000) }).strict(), body);
    if (!['announcement', 'contactEmail', 'shippingPolicy', 'returnsPolicy'].includes(key))
      throw new BadRequestException('Unsupported setting');
    const record = await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await this.admin.audit(req.user!.id, 'SETTING_UPDATED', 'setting', key);
    return ok(record);
  }
  @Get('users') @Require('users:update') async users() {
    return ok({
      users: await db.user.findMany({
        where: { roles: { some: {} } },
        select: { id: true, email: true, name: true, roles: { include: { role: true } } },
      }),
      roles: await db.role.findMany(),
    });
  }
  @Post('users/role') @Require('users:update') async role(@Body() body: unknown, @Req() req: RequestContext) {
    const data = parse(z.object({ email: z.email(), roleId: z.uuid() }).strict(), body);
    const user = await db.user.findUniqueOrThrow({ where: { email: data.email.toLowerCase() } });
    if (user.id === req.user!.id)
      throw new BadRequestException('Ask another administrator to change your role');
    await db.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.userRole.create({ data: { userId: user.id, roleId: data.roleId } });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_ROLE_CHANGED',
          resource: 'user',
          resourceId: user.id,
          metadata: { roleId: data.roleId },
        },
      });
    });
    return ok({ updated: true });
  }
}

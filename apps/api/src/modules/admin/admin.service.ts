import { Injectable } from '@nestjs/common';
import { db, Prisma } from '@mitti/database';
@Injectable()
export class AdminService {
  async dashboard() {
    const since = new Date(Date.now() - 30 * 86400000);
    const paid = {
      status: {
        notIn: ['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED'] as (
          'PENDING_PAYMENT' | 'CANCELLED' | 'REFUNDED'
        )[],
      },
      createdAt: { gte: since },
    };
    const [revenue, orders, customers, lowStock, recent, topItems, events] = await Promise.all([
      db.order.aggregate({ where: paid, _sum: { total: true }, _count: true }),
      db.order.groupBy({ by: ['status'], _count: true }),
      db.user.count({ where: { roles: { none: {} } } }),
      db.inventory.findMany({
        where: { available: { lte: 5 } },
        include: { variant: { include: { product: { select: { title: true } } } } },
        take: 10,
      }),
      db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { items: true } }),
      db.orderItem.groupBy({
        by: ['title'],
        _sum: { quantity: true, unitPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      db.analyticsEvent.groupBy({ by: ['type'], where: { createdAt: { gte: since } }, _count: true }),
    ]);
    const daily = await db.$queryRaw<{ day: string; revenue: number }[]>(
      Prisma.sql`SELECT to_char("createdAt", 'Mon DD') AS day, SUM(total)::int AS revenue FROM "Order" WHERE "createdAt" >= ${since} AND status NOT IN ('PENDING_PAYMENT','CANCELLED','REFUNDED') GROUP BY date_trunc('day', "createdAt"), to_char("createdAt", 'Mon DD') ORDER BY date_trunc('day', "createdAt")`,
    );
    return {
      revenue: revenue._sum.total || 0,
      orderCount: revenue._count,
      aov: revenue._count ? Math.round((revenue._sum.total || 0) / revenue._count) : 0,
      customers,
      lowStock,
      recent: recent.map(({ accessTokenHash: _a, requestHash: _b, idempotencyKey: _c, ...order }) => order),
      topItems,
      events,
      daily,
      statuses: orders,
    };
  }
  async audit(
    actorId: string,
    action: string,
    resource: string,
    resourceId: string,
    metadata: Prisma.InputJsonValue = {},
  ) {
    return db.auditLog.create({ data: { actorId, action, resource, resourceId, metadata } });
  }
}

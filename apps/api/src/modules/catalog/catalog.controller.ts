import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { db } from '@mitti/database';
import { CatalogService } from './catalog.service';
import { ok } from '../../common/http';
@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}
  @Get('products') async list(@Query() query: Record<string, string>) {
    const { products, ...meta } = await this.catalog.list(query);
    return ok(products, meta);
  }
  @Get('products/:slug') async product(@Param('slug') slug: string) {
    return ok(await this.catalog.get(slug));
  }
  @Get('categories') async categories() {
    return ok(await db.category.findMany({ orderBy: { name: 'asc' } }));
  }
  @Get('collections') async collections() {
    return ok(await db.collection.findMany());
  }
  @Get('content') async content() {
    const now = new Date();
    return ok({
      sections: await db.homepageSection.findMany({
        where: {
          enabled: true,
          status: 'PUBLISHED',
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { position: 'asc' },
      }),
      settings: await db.siteSetting.findMany(),
      navigation: await db.navigationMenu.findUnique({ where: { location: 'main' } }),
    });
  }
}

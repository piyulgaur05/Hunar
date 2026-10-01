import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, Prisma } from '@mitti/database';
import type { ProductInput } from '@mitti/validation';
import { z } from 'zod';
export const productInclude = {
  category: true,
  images: { orderBy: { position: 'asc' as const } },
  variants: { where: { active: true }, include: { inventory: true } },
  customizations: true,
  reviews: { where: { approved: true }, include: { user: { select: { name: true } } }, take: 20 },
  collections: { include: { collection: true } },
};
@Injectable()
export class CatalogService {
  async list(query: Record<string, string>, admin = false) {
    z.object({page:z.coerce.number().int().min(1).max(100000).optional(),limit:z.coerce.number().int().min(1).max(48).optional(),status:z.enum(['DRAFT','PUBLISHED','SCHEDULED','ARCHIVED','']).optional(),min:z.coerce.number().int().min(0).optional(),max:z.coerce.number().int().min(0).optional()}).parse(query);
    const page = Math.max(1, Number(query.page) || 1),
      limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(!admin
        ? { status: 'PUBLISHED' }
        : query.status
          ? { status: query.status as Prisma.EnumProductStatusFilter }
          : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.collection ? { collections: { some: { collection: { slug: query.collection } } } } : {}),
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.personalized === 'true' ? { customizations: { some: {} } } : {}),
    };
    if (query.q) {
      const q = query.q.slice(0, 150);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        { attributes: { some: { value: { contains: q, mode: 'insensitive' } } } },
        { collections: { some: { collection: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }
    if (query.min || query.max || query.available === 'true')
      where.variants = {
        some: {
          active: true,
          price: {
            ...(query.min ? { gte: Math.max(0, Number(query.min) || 0) } : {}),
            ...(query.max ? { lte: Math.max(0, Number(query.max) || 0) } : {}),
          },
          ...(query.available === 'true' ? { inventory: { available: { gt: 0 } } } : {}),
        },
      };
    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort==='price-asc'?{priceFrom:'asc'}:query.sort==='price-desc'?{priceFrom:'desc'}:
      query.sort === 'name' ? { title: 'asc' } : { createdAt: 'desc' };
    const [products, total] = await Promise.all([
      db.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * limit, take: limit }),
      db.product.count({ where }),
    ]);
    return { products, total, page, pages: Math.ceil(total / limit) };
  }
  async get(slug: string, admin = false) {
    const product = await db.product.findFirst({
      where: {
        OR: [{ slug }, ...(/^[0-9a-f-]{36}$/i.test(slug) ? [{ id: slug }] : [])],
        deletedAt: null,
        ...(!admin ? { status: 'PUBLISHED' } : {}),
      },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('This piece could not be found');
    return product;
  }
  async save(input: ProductInput, actorId: string, id?: string) {
    const { images, variants, customizations, ...data } = input;
    const productData={...data,priceFrom:Math.min(...variants.filter(v=>v.active).map(v=>v.price))};
    if(!Number.isFinite(productData.priceFrom))throw new BadRequestException('At least one variant must be active');
    if (new Set(variants.map((v) => v.sku)).size !== variants.length)
      throw new BadRequestException('Variant SKUs must be unique');
    if (data.status === 'SCHEDULED' && !data.publishedAt)
      throw new BadRequestException('Choose a publishing date');
    return db.$transaction(
      async (tx) => {
        const product = id
          ? await tx.product.update({ where: { id }, data:productData })
          : await tx.product.create({ data:productData });
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({
          data: images.map((image) => ({ ...image, productId: product.id })),
        });
        await tx.customizationField.deleteMany({ where: { productId: product.id } });
        if (customizations.length)
          await tx.customizationField.createMany({
            data: customizations.map((field) => ({ ...field, productId: product.id })),
          });
        await tx.productVariant.updateMany({
          where: { productId: product.id, id: { notIn: variants.flatMap((v) => (v.id ? [v.id] : [])) } },
          data: { active: false },
        });
        for (const { stock, id: variantId, ...variant } of variants) {
          if (variantId) {
            const current = await tx.productVariant.findFirst({
              where: { id: variantId, productId: product.id },
              include: { inventory: true },
            });
            if (!current) throw new BadRequestException('Variant does not belong to this product');
            await tx.productVariant.update({ where: { id: variantId }, data: variant });
            if (stock !== current.inventory?.available) {
              await tx.inventory.update({
                where: { variantId },
                data: {
                  available: stock,
                  transactions: {
                    create: {
                      type: 'ADJUSTMENT',
                      quantity: stock - (current.inventory?.available || 0),
                      actorId,
                    },
                  },
                },
              });
            }
          } else
            await tx.productVariant.create({
              data: { ...variant, productId: product.id, inventory: { create: { available: stock } } },
            });
        }
        await tx.auditLog.create({
          data: {
            actorId,
            action: id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
            resource: 'product',
            resourceId: product.id,
          },
        });
        return product;
      },
      { isolationLevel: 'Serializable' },
    );
  }
  async archive(id: string, actorId: string) {
    return db.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: { status: 'ARCHIVED', deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'PRODUCT_ARCHIVED', resource: 'product', resourceId: id },
      });
      return product;
    });
  }
}

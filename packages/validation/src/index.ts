import { z } from 'zod';
export const email = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
export const password = z.string().min(12, 'Use at least 12 characters').max(128);
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email, password }).strict();
export const addressSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^[+\d\s-]{10,16}$/, 'Enter a valid phone number'),
    line1: z.string().trim().min(5).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a six-digit Indian PIN code'),
    country: z.literal('IN').default('IN'),
  })
  .strict();
export const cartItemSchema = z
  .object({
    variantId: z.uuid(),
    quantity: z.number().int().min(1).max(20),
    customization: z.record(z.string(), z.string().max(500)).default({}),
    giftWrap: z.boolean().default(false),
  })
  .strict();
export const checkoutSchema = z
  .object({
    email,
    address: addressSchema,
    coupon: z.string().trim().max(32).optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const imageSchema = z
  .object({ url: z.url().max(2000), alt: z.string().max(200), position: z.number().int().min(0).default(0) })
  .strict();
export const customizationSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
    label: z.string().min(1).max(100),
    type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'image-upload']),
    required: z.boolean().default(false),
    maxLength: z.number().int().min(1).max(500).default(100),
    options: z.array(z.string().max(100)).max(30).default([]),
    priceAdjustment: z.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export const variantSchema = z
  .object({
    id: z.uuid().optional(),
    sku: z.string().min(2).max(64),
    name: z.string().min(1).max(100),
    price: z.number().int().min(100).max(100000000),
    compareAtPrice: z.number().int().min(100).nullable().optional(),
    stock: z.number().int().min(0).max(1000000).default(0),
    weightGrams: z.number().int().min(1).default(500),
    active: z.boolean().default(true),
  })
  .strict();
export const productSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
    subtitle: z.string().max(150),
    description: z.string().min(20).max(20000),
    categoryId: z.uuid(),
    artisan: z.string().min(2).max(100),
    origin: z.string().min(2).max(100),
    materials: z.string().max(500),
    care: z.string().max(1000),
    dimensions: z.string().max(200),
    status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']),
    featured: z.boolean().default(false),
    seoTitle: z.string().max(160).optional(),
    seoDescription: z.string().max(320).optional(),
    publishedAt: z.iso.datetime().nullable().optional(),
    images: z.array(imageSchema).min(1).max(12),
    variants: z.array(variantSchema).min(1).max(100),
    customizations: z.array(customizationSchema).max(12).default([]),
  })
  .strict();
export const couponSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{3,32}$/),
    percent: z.number().int().min(1).max(80),
    minimum: z.number().int().min(0),
    maxDiscount: z.number().int().positive().nullable().optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    active: z.boolean(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .strict();
export const sectionSchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.record(z.string(), z.string().max(3000)),
    position: z.number().int().min(0).max(100),
    enabled: z.boolean(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    startsAt: z.iso.datetime().nullable().optional(),
    endsAt: z.iso.datetime().nullable().optional(),
  })
  .strict();
export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

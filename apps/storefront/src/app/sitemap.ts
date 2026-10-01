import type { MetadataRoute } from 'next';
import { serverApi } from '@/lib/api';
import type { Product, Taxonomy } from '@mitti/types';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [products, collections] = await Promise.all([
    serverApi<Product[]>('products?limit=48'),
    serverApi<Taxonomy[]>('collections'),
  ]);
  return [
    '',
    '/shop',
    '/collections',
    '/our-story',
    '/journal',
    ...products.map((p) => `/products/${p.slug}`),
    ...collections.map((c) => `/collections/${c.slug}`),
  ].map((path) => ({ url: base + path, changeFrequency: 'weekly', priority: path === '' ? 1 : 0.7 }));
}

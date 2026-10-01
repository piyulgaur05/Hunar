import Link from 'next/link';
import type { Product, Taxonomy } from '@mitti/types';
import { serverApi } from '@/lib/api';
import { Catalog } from '@/components/product/catalog';
export const metadata = {
  title: 'The collection',
  description:
    'Discover handcrafted ceramics, meaningful gifts, jewelry and beautiful objects for your home.',
};
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const query = await searchParams;
  const [products, categories] = await Promise.all([
    serverApi<Product[]>(
      `products?limit=12&category=${encodeURIComponent(query.category || '')}&q=${encodeURIComponent(query.q || '')}`,
    ),
    serverApi<Taxonomy[]>('categories'),
  ]);
  return (
    <>
      <div className="page-heading">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>The collection</span>
        </div>
        <span className="chapter">
          <b>Shop</b>Every piece, a story
        </span>
        <span className="eyebrow">GOOD THINGS. MADE SLOWLY.</span>
        <h1>
          {categories.find((c) => c.slug === query.category)?.name || (
            <>
              A world of <em>thoughtful</em> things.
            </>
          )}
        </h1>
        <p>
          Made by independent artisans. Chosen with intention. Find the piece whose story feels a little like
          yours.
        </p>
      </div>
      <Catalog
        initialProducts={products}
        categories={categories}
        initialCategory={query.category}
        initialQuery={query.q}
      />
    </>
  );
}

import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';
import type { Taxonomy, Product } from '@mitti/types';
import { Catalog } from '@/components/product/catalog';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collections = await serverApi<Taxonomy[]>('collections');
  const c = collections.find((c) => c.slug === slug);
  return {
    title: c?.name || 'Collection',
    description: c?.description,
    alternates: { canonical: `/collections/${slug}` },
  };
}
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [collections, categories, products] = await Promise.all([
    serverApi<Taxonomy[]>('collections'),
    serverApi<Taxonomy[]>('categories'),
    serverApi<Product[]>(`products?collection=${encodeURIComponent(slug)}`),
  ]);
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) notFound();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">THE CONSIDERED COLLECTION</span>
        <h1>{collection.name}</h1>
        <p>{collection.description}</p>
      </div>
      <Catalog initialProducts={products} categories={categories} collection={slug} />
    </>
  );
}

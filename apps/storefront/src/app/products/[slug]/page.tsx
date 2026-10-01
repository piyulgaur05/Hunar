import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Product } from '@mitti/types';
import { serverApi } from '@/lib/api';
import { ProductPurchase } from '@/components/product/product-purchase';
import { ProductCard } from '@/components/product/product-card';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await serverApi<Product>(`products/${slug}`);
    return {
      title: p.seoTitle || p.title,
      description: p.seoDescription || p.description.slice(0, 155),
      alternates: { canonical: `/products/${slug}` },
      openGraph: { images: p.images.map((i) => i.url) },
    };
  } catch {
    return { title: 'Piece not found' };
  }
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: Product;
  try {
    product = await serverApi<Product>(`products/${encodeURIComponent(slug)}`);
  } catch {
    notFound();
  }
  const related = (await serverApi<Product[]>(`products?category=${product.category.slug}&limit=4`)).filter(
    (p) => p.id !== product.id,
  );
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    brand: { '@type': 'Brand', name: product.artisan },
    offers: {
      '@type': 'Offer',
      price: (product.variants[0]?.price || 0) / 100,
      priceCurrency: 'INR',
      availability: product.variants[0]?.inventory?.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/products/${slug}`,
    },
  };
  return (
    <>
      <div className="product-detail">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">The collection</Link>
          <span>/</span>
          <span>{product.title}</span>
        </div>
        <ProductPurchase product={product} />
        <section className="reviews-section">
          <h2>From their homes, to yours.</h2>
          {product.reviews.length ? (
            <div className="review-list">
              {product.reviews.map((r) => (
                <article className="review" key={r.id}>
                  <span style={{ color: 'var(--clay)' }}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                  <small>{r.user.name}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">
              This piece is waiting for its first story. Reviews from verified buyers appear here.
            </p>
          )}
        </section>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BETTER TOGETHER</span>
            <h2>A few kindred pieces.</h2>
          </div>
        </div>
        <div className="product-grid">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
    </>
  );
}

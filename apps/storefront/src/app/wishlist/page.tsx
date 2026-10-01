'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { Product } from '@mitti/types';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { useIdentity } from '@/components/providers';
export default function Wishlist() {
  const { data: user, isLoading } = useIdentity();
  const { data: products, isLoading: loading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api<Product[]>('wishlist'),
    enabled: !!user,
  });
  return (
    <section className="section">
      <span className="eyebrow">KEEP A LITTLE BEAUTIFUL CLOSE</span>
      <h1 className="serif" style={{ fontSize: 55 }}>
        Your thoughtful little list.
      </h1>
      {isLoading || (loading && user) ? (
        <p>Gathering your favourites…</p>
      ) : !user ? (
        <div className="empty">
          <Heart size={32} />
          <h2>A home for your favourites.</h2>
          <p>Sign in to save the pieces you’d love to come back to.</p>
          <Link className="button" href="/account">
            Sign in
          </Link>
        </div>
      ) : products?.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Something will catch your eye.</h2>
          <p>Tap the heart on a piece to keep it here.</p>
          <Link className="button" href="/shop">
            Find your favourite
          </Link>
        </div>
      )}
    </section>
  );
}

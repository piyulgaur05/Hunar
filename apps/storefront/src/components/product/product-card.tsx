'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@mitti/types';
import { currency } from '@mitti/commerce';
import { api, track } from '@/lib/api';
import { useUi, useRefresh, useIdentity } from '../providers';
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { notify, setBagOpen } = useUi(),
    refresh = useRefresh(),
    { data: user } = useIdentity();
  const [wished, setWished] = useState(false),
    [busy, setBusy] = useState(false);
  const variant = product.variants[0];
  if (!variant) return null;
  const rating = product.reviews?.length
    ? (product.reviews.reduce((n, r) => n + r.rating, 0) / product.reviews.length).toFixed(1)
    : null;
  async function wish() {
    if (!user) {
      notify('Sign in to save your favourite pieces.');
      return;
    }
    try {
      await api(`wishlist/${product.id}`, { method: wished ? 'DELETE' : 'POST' });
      setWished(!wished);
      refresh('wishlist');
      notify(wished ? 'Removed from your wishlist.' : 'Saved to your wishlist.');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function add() {
    setBusy(true);
    try {
      await api('cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });
      track('add_to_cart', product.id);
      await refresh('cart');
      setBagOpen(true);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="product-card">
      <div className="product-card-image">
        <Link href={`/products/${product.slug}`}>
          <Image
            src={product.images[0]?.url}
            alt={product.images[0]?.alt || product.title}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
        </Link>
        {index === 0 && <span className="product-badge">A LITTLE FAVOURITE</span>}
        {product.customizations.length > 0 && index !== 0 && (
          <span className="product-badge">MAKE IT PERSONAL</span>
        )}
        <button
          className={`wish-button ${wished ? 'active' : ''}`}
          onClick={wish}
          aria-label={`Save ${product.title}`}
          aria-pressed={wished}
        >
          <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>
        <div className="card-story">
          <span className="eyebrow">A story from {product.origin}</span>
          <p>
            Made by {product.artisan}
            {product.materials ? ` · ${product.materials}` : ''}
          </p>
          {product.customizations.length ? (
            <Link href={`/products/${product.slug}`} className="quick-add">
              Make it yours <Plus size={15} />
            </Link>
          ) : (
            <button className="quick-add" disabled={busy || !variant.inventory?.available} onClick={add}>
              {busy ? 'Adding…' : variant.inventory?.available ? 'Add to bag' : 'Sold out'}
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="product-card-meta">
        <div className="product-card-topline">
          <p className="eyebrow">{product.artisan}</p>
          <span className="card-number">№ {String(index + 1).padStart(2, '0')}</span>
        </div>
        <Link href={`/products/${product.slug}`}>
          <h3>{product.title}</h3>
        </Link>
        <p>{product.subtitle}</p>
        <div>
          <span className="price">{currency(variant.price)}</span>
          {variant.compareAtPrice && <span className="strike">{currency(variant.compareAtPrice)}</span>}
          {rating && (
            <span className="card-rating">
              <Star size={11} fill="currentColor" />
              {rating}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

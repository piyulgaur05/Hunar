'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Minus, Plus, Truck, HandHeart, Gift, ShieldCheck, X, Heart } from 'lucide-react';
import { currency, GIFT_WRAP_PRICE, personalizationPrice } from '@mitti/commerce';
import type { Product } from '@mitti/types';
import { api, track } from '@/lib/api';
import { useUi, useRefresh } from '../providers';
export function ProductPurchase({ product }: { product: Product }) {
  const [selected, setSelected] = useState(product.variants[0].id),
    [qty, setQty] = useState(1),
    [wrap, setWrap] = useState(false),
    [custom, setCustom] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [image, setImage] = useState(0);
  const { setBagOpen, notify } = useUi(),
    refresh = useRefresh(),
    router = useRouter();
  const variant = product.variants.find((v) => v.id === selected)!;
  let extra = 0;
  try {
    extra = personalizationPrice(product.customizations, custom);
  } catch {}
  useEffect(() => {
    track('product_view', product.id);
  }, [product.id]);
  async function add(buy = false) {
    setBusy(true);
    setError('');
    try {
      await api('cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId: selected, quantity: qty, customization: custom, giftWrap: wrap }),
      });
      track('add_to_cart', product.id);
      await refresh('cart');
      if (buy) router.push('/checkout');
      else setBagOpen(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-detail-grid">
      <div>
        <div className="product-gallery">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button aria-label="Zoom product image">
                <Image
                  src={product.images[image].url}
                  alt={product.images[image].alt}
                  fill
                  priority
                  sizes="(max-width:640px) 100vw,50vw"
                />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="gallery-zoom">
                <Dialog.Title className="sr-only">{product.title}</Dialog.Title>
                <Dialog.Description className="sr-only">Full-size product photograph</Dialog.Description>
                <Image src={product.images[image].url} alt={product.images[image].alt} fill sizes="90vw" />
                <Dialog.Close className="icon-button dialog-close" aria-label="Close image">
                  <X />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        {product.images.length > 1 && (
          <div className="gallery-thumbs">
            {product.images.map((photo, i) => (
              <button onClick={() => setImage(i)} key={photo.id} aria-label={`View photo ${i + 1}`}>
                <Image src={photo.url} alt={photo.alt} width={70} height={80} />
              </button>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 10, marginTop: 15 }}>
          Handmade, so beautifully one of a kind. Small variations are part of its story.
        </p>
      </div>
      <div className="product-info">
        <span className="eyebrow">
          {product.artisan} · {product.origin}
        </span>
        <h1>{product.title}</h1>
        <p className="subtitle">{product.subtitle}</p>
        <span className="price">{currency(variant.price + extra + (wrap ? GIFT_WRAP_PRICE : 0))}</span>
        {variant.compareAtPrice && <span className="strike">{currency(variant.compareAtPrice)}</span>}
        <p className="tax-note">Inclusive of applicable taxes</p>
        <hr className="divider" />
        <p className="description">{product.description}</p>
        <label style={{ fontSize: 12 }}>
          Finish: <strong>{variant.name}</strong>
        </label>
        <div className="variant-options">
          {product.variants.map((v) => (
            <button
              className={selected === v.id ? 'selected' : ''}
              aria-pressed={selected === v.id}
              key={v.id}
              onClick={() => setSelected(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
        <div className="stack">
          {product.customizations.map((field) => (
            <label className="field" key={field.key}>
              {field.label}
              {field.required ? ' *' : ''}
              {field.type === 'textarea' ? (
                <textarea
                  maxLength={field.maxLength}
                  required={field.required}
                  value={custom[field.key] || ''}
                  onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                />
              ) : ['select', 'radio'].includes(field.type) ? (
                <select
                  required={field.required}
                  value={custom[field.key] || ''}
                  onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                >
                  <option value="">Choose an option</option>
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={custom[field.key] === 'true'}
                  onChange={(e) => setCustom({ ...custom, [field.key]: String(e.target.checked) })}
                />
              ) : field.type === 'image-upload' ? (
                <span className="muted">Contact our team before ordering photo-personalized pieces.</span>
              ) : (
                <input
                  maxLength={field.maxLength}
                  required={field.required}
                  placeholder="A little something, just for them"
                  value={custom[field.key] || ''}
                  onChange={(e) => setCustom({ ...custom, [field.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        <label className="gift-check">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
          <span>
            Make it a gift · {currency(GIFT_WRAP_PRICE)}
            <br />
            <span className="muted">Thoughtfully wrapped in recyclable paper, with a handwritten note.</span>
          </span>
        </label>
        <p className="stock-status">
          {variant.inventory?.available
            ? variant.inventory.available < 6
              ? `Just ${variant.inventory.available} left in this small batch`
              : 'In stock, ready to find a home'
            : 'This batch has found its homes'}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="product-purchase">
          <div className="quantity">
            <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
              <Minus size={14} />
            </button>
            <span>{qty}</span>
            <button
              aria-label="Increase quantity"
              disabled={qty >= Math.min(20, variant.inventory?.available || 0)}
              onClick={() => setQty(qty + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
          <button className="button" disabled={busy || !variant.inventory?.available} onClick={() => add()}>
            {busy ? 'Adding…' : 'Add to bag'}
            <ArrowRight size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Save to wishlist"
            onClick={async () => {
              try {
                await api(`wishlist/${product.id}`, { method: 'POST' });
                notify('Saved to your wishlist.');
              } catch {
                notify('Sign in to save your favourite pieces.');
              }
            }}
          >
            <Heart size={19} />
          </button>
        </div>
        <button
          className="text-link"
          disabled={busy || !variant.inventory?.available}
          onClick={() => add(true)}
        >
          Make it yours now <ArrowRight size={15} />
        </button>
        <div className="product-benefits">
          <span>
            <Truck size={17} />
            Arrives in 5–8 working days
          </span>
          <span>
            <HandHeart size={17} />
            Made by independent artisans
          </span>
          <span>
            <Gift size={17} />
            Thoughtfully packed
          </span>
          <span>
            <ShieldCheck size={17} />
            Secure checkout
          </span>
        </div>
        <div className="product-accordion">
          <details>
            <summary>The details</summary>
            <p>
              {product.materials}
              <br />
              {product.dimensions}
            </p>
          </details>
          <details>
            <summary>Made to be cared for</summary>
            <p>{product.care}</p>
          </details>
          <details>
            <summary>A little about the maker</summary>
            <p>
              {product.artisan} creates small-batch pieces in {product.origin}, keeping traditional skills
              alive through contemporary objects.
            </p>
          </details>
          <details>
            <summary>Shipping & returns</summary>
            <p>
              Dispatched with care. Standard delivery takes 5–8 working days. Contact us within 7 days if your
              piece arrives damaged or isn’t quite right. Personalized pieces are made just for you and cannot
              be returned unless damaged.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}

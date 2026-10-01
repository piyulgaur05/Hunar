'use client';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { currency, GIFT_WRAP_PRICE, personalizationPrice } from '@mitti/commerce';
import { useCart, useUi, useRefresh } from '../providers';
import { api } from '@/lib/api';
export function Bag() {
  const { bagOpen, setBagOpen } = useUi(),
    { data: cart, isLoading } = useCart(),
    refresh = useRefresh();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function update(id: string, quantity: number) {
    setBusy(true);
    setError('');
    try {
      await api(`cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
      await refresh('cart');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open={bagOpen} onOpenChange={setBagOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="bag-drawer">
          <div className="bag-title">
            <Dialog.Title>
              Your bag <span>({cart?.items.length || 0})</span>
            </Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close bag">
              <X size={22} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="bag-note">Stories you’re taking home.</Dialog.Description>
          {error && <p className="error-message">{error}</p>}
          {isLoading ? (
            <p>Opening your bag…</p>
          ) : !cart?.items.length ? (
            <div className="empty">
              <ShoppingBag size={38} />
              <h2>Room for a story or two.</h2>
              <p>Your bag is waiting for its first handmade piece.</p>
              <Link href="/shop" className="button" onClick={() => setBagOpen(false)}>
                Explore the shop <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="shipping-progress">
                <p>
                  {cart.subtotal >= 250000
                    ? 'Your order qualifies for complimentary shipping.'
                    : `${currency(250000 - cart.subtotal)} away from complimentary shipping`}
                </p>
                <div>
                  <span style={{ width: `${Math.min(100, cart.subtotal / 2500)}%` }} />
                </div>
              </div>
              <div className="bag-items">
                {cart.items.map((item) => (
                  <div className="bag-item" key={item.id}>
                    <Image
                      src={item.variant.product.images[0].url}
                      alt={item.variant.product.title}
                      width={100}
                      height={120}
                    />
                    <div>
                      <Link href={`/products/${item.variant.product.slug}`} onClick={() => setBagOpen(false)}>
                        {item.variant.product.title}
                      </Link>
                      <p>
                        {item.variant.name}
                        {item.giftWrap ? ' · Gift wrapped' : ''}
                      </p>
                      {Object.entries(item.customization).map(([key, value]) => (
                        <p key={key}>{value}</p>
                      ))}
                      <span className="price">
                        {currency(
                          item.variant.price +
                            personalizationPrice(item.variant.product.customizations, item.customization) +
                            (item.giftWrap ? GIFT_WRAP_PRICE : 0),
                        )}
                      </span>
                      <div className="quantity">
                        <button
                          disabled={busy}
                          aria-label={`Decrease ${item.variant.product.title}`}
                          onClick={() => update(item.id, item.quantity - 1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          disabled={busy}
                          aria-label={`Increase ${item.variant.product.title}`}
                          onClick={() => update(item.id, item.quantity + 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <button
                      disabled={busy}
                      className="icon-button remove-item"
                      aria-label={`Remove ${item.variant.product.title}`}
                      onClick={() => update(item.id, 0)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bag-summary">
                <div>
                  <span>Subtotal</span>
                  <span>{currency(cart.subtotal)}</span>
                </div>
                <p>Shipping and any discounts are calculated at checkout.</p>
                <Link href="/checkout" className="button" onClick={() => setBagOpen(false)}>
                  Continue to checkout <ArrowRight size={17} />
                </Link>
                <button className="text-link" onClick={() => setBagOpen(false)}>
                  A little more browsing
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

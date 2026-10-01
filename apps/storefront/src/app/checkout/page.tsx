'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addressSchema, email } from '@mitti/validation';
import { currency, calculateTotals } from '@mitti/commerce';
import type { Order } from '@mitti/types';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, useRefresh } from '@/components/providers';
import { api, track } from '@/lib/api';
const schema = z.object({ email, address: addressSchema });
type FormValues = z.input<typeof schema>;
const addressFields = [
  ['name', 'Full name'],
  ['phone', 'Phone number'],
  ['line1', 'Address line 1'],
  ['line2', 'Apartment, suite, etc. (optional)'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'PIN code'],
] as const;
export default function Checkout() {
  const { data: cart, isLoading } = useCart(),
    refresh = useRefresh(),
    router = useRouter();
  const [step, setStep] = useState(0),
    [coupon, setCoupon] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [key] = useState(() => crypto.randomUUID());
  const {
    register,
    trigger,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { address: { country: 'IN' } } });
  const values = watch();
  const totals = calculateTotals(cart?.subtotal || 0);
  async function next() {
    const valid = step === 0 ? await trigger('email') : await trigger('address');
    if (valid) {
      setStep(step + 1);
      setError('');
    }
  }
  async function submit(input: FormValues) {
    setBusy(true);
    setError('');
    try {
      track('checkout_started');
      const order = await api<Order>('checkout', {
        method: 'POST',
        body: JSON.stringify({ ...input, coupon: coupon || undefined, idempotencyKey: key }),
      });
      await refresh('cart');
      router.push(`/orders/${order.id}?pay=1`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <div className="empty">Preparing your checkout…</div>;
  if (!cart?.items.length)
    return (
      <div className="empty">
        <h2>Your bag is a little quiet.</h2>
        <p>Choose something meaningful before checking out.</p>
        <Link className="button" href="/shop">
          Find your favourite
        </Link>
      </div>
    );
  return (
    <div className="checkout">
      <span className="eyebrow">A FEW DETAILS, THEN IT’S YOURS</span>
      <h1>On its way to you.</h1>
      <div className="checkout-grid">
        <div>
          <nav className="checkout-steps" aria-label="Checkout progress">
            {['Contact', 'Delivery', 'Review & pay'].map((text, i) => (
              <span className={step === i ? 'active' : ''} key={text}>
                {String(i + 1).padStart(2, '0')} {text}
              </span>
            ))}
          </nav>
          <form onSubmit={handleSubmit(submit)}>
            {step === 0 && (
              <>
                <h2 className="step-title">Let’s keep in touch.</h2>
                <p className="muted">We’ll send your order updates here. No account needed.</p>
                <label className="field">
                  Email address
                  <input type="email" autoComplete="email" {...register('email')} />
                  {errors.email && <span className="field-error">{errors.email.message}</span>}
                </label>
                <p style={{ fontSize: 12, marginTop: 20 }}>
                  Already part of our story?{' '}
                  <Link className="text-link" href="/account">
                    Sign in
                  </Link>
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="step-title">Where should we send it?</h2>
                <div className="form-grid">
                  {addressFields.map(([key, label]) => (
                    <label className={`field ${['line1', 'line2'].includes(key) ? 'span-2' : ''}`} key={key}>
                      {label}
                      <input
                        {...register(`address.${key}`)}
                        autoComplete={
                          key === 'name'
                            ? 'name'
                            : key === 'postalCode'
                              ? 'postal-code'
                              : key === 'phone'
                                ? 'tel'
                                : key === 'city'
                                  ? 'address-level2'
                                  : key === 'state'
                                    ? 'address-level1'
                                    : key === 'line1'
                                      ? 'address-line1'
                                      : 'address-line2'
                        }
                      />
                      {errors.address?.[key] && (
                        <span className="field-error">{errors.address[key]?.message}</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
                  Delivery within India · 5–8 working days
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="step-title">A final little look.</h2>
                <div className="order-card">
                  <h3>Contact & delivery</h3>
                  <p>
                    {values.email}
                    <br />
                    {values.address?.name}
                    <br />
                    {values.address?.line1} {values.address?.line2}
                    <br />
                    {values.address?.city}, {values.address?.state} {values.address?.postalCode}
                    <br />
                    {values.address?.phone}
                  </p>
                  <button type="button" className="text-link" onClick={() => setStep(1)}>
                    Edit delivery details
                  </button>
                </div>
                <label className="field">
                  A little thank-you code
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Gift or discount code"
                  />
                </label>
                <p className="muted" style={{ fontSize: 12, marginTop: 15 }}>
                  Your final total, including valid discounts, will be confirmed before payment. By
                  continuing, you agree to our{' '}
                  <Link href="/terms" className="text-link">
                    terms
                  </Link>
                  .
                </p>
              </>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="checkout-actions">
              {step > 0 ? (
                <button type="button" className="button light" onClick={() => setStep(step - 1)}>
                  Back
                </button>
              ) : (
                <Link className="text-link" href="/shop">
                  Back to the shop
                </Link>
              )}
              {step < 2 ? (
                <button type="button" className="button" onClick={next}>
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button className="button" disabled={busy} type="submit">
                  {busy ? 'Reserving your pieces…' : 'Continue to payment'}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
        <aside className="checkout-summary">
          <h2>A thoughtful selection.</h2>
          {cart.items.map((item) => (
            <div className="checkout-item" key={item.id}>
              <Image
                src={item.variant.product.images[0].url}
                alt={item.variant.product.title}
                width={65}
                height={80}
              />
              <div>
                {item.variant.product.title}
                <p>
                  {item.variant.name} · Qty {item.quantity}
                </p>
                {item.giftWrap && <p>Gift wrapped</p>}
              </div>
              <span>{currency(item.variant.price * item.quantity)}</span>
            </div>
          ))}
          <hr className="divider" />
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{currency(totals.subtotal)}</span>
            </div>
            <div>
              <span>Standard shipping</span>
              <span>{totals.shipping ? currency(totals.shipping) : 'Complimentary'}</span>
            </div>
            <div>
              <span>Estimated total</span>
              <span>{currency(totals.total)}</span>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 10, marginTop: 20, display: 'flex', gap: 7 }}>
            <LockKeyhole size={14} />
            Secure checkout · Prices include applicable taxes
          </p>
        </aside>
      </div>
    </div>
  );
}

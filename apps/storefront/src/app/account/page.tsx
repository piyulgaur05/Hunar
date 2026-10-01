'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { currency } from '@mitti/commerce';
import type { Address, Order } from '@mitti/types';
import { useIdentity, useRefresh } from '@/components/providers';
import { api } from '@/lib/api';
function Account() {
  const params = useSearchParams();
  const { data: user, isLoading } = useIdentity(),
    refresh = useRefresh();
  const [mode, setMode] = useState(params.get('mode') || 'login'),
    [tab, setTab] = useState('Orders'),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<Order[]>('orders'),
    enabled: !!user,
  });
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<(Address & { id: string })[]>('addresses'),
    enabled: !!user,
  });
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === 'verify') {
        const result = await api<{ message: string }>('auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: params.get('token') }),
        });
        setSuccess(result.message);
        setMode('login');
      } else if (mode === 'reset') {
        const result = await api<{ message: string }>('auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token: params.get('token'), password: form.password }),
        });
        setSuccess(result.message);
        setMode('login');
      } else if (mode === 'forgot') {
        const result = await api<{ message: string }>('auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: form.email }),
        });
        setSuccess(result.message);
      } else {
        await api(`auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
        await refresh('identity');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <div className="empty">Opening your account…</div>;
  if (!user || mode === 'reset' || mode === 'verify')
    return (
      <div className="account-page">
        <div className="auth-card">
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1>
            {mode === 'register'
              ? 'Make yourself at home.'
              : mode === 'forgot'
                ? 'A fresh start.'
                : mode === 'reset'
                  ? 'A new password.'
                  : mode === 'verify'
                    ? 'One little confirmation.'
                    : 'Lovely to see you.'}
          </h1>
          <p>
            {mode === 'register'
              ? 'Save your favourites and follow your handmade finds.'
              : mode === 'forgot'
                ? 'We’ll send you a link to reset your password.'
                : mode === 'verify'
                  ? 'Confirm your email to complete your account.'
                  : 'Sign in to your Mitti & Thread account.'}
          </p>
          <form onSubmit={auth}>
            {mode === 'register' && (
              <label className="field">
                Your name
                <input name="name" required minLength={2} autoComplete="name" />
              </label>
            )}
            {!['verify', 'reset'].includes(mode) && (
              <label className="field">
                Email address
                <input type="email" name="email" required autoComplete="email" />
              </label>
            )}
            {!['forgot', 'verify'].includes(mode) && (
              <label className="field">
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={mode === 'login' ? 1 : 12}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode !== 'login' && <span className="muted">At least 12 characters</span>}
              </label>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="success-message" role="status">
                {success}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? 'Just a moment…'
                : mode === 'register'
                  ? 'Create your account'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : mode === 'reset'
                      ? 'Save new password'
                      : mode === 'verify'
                        ? 'Verify email'
                        : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="auth-tabs">
            <button
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError('');
              }}
            >
              {mode === 'register' ? 'Already have an account?' : 'Create an account'}
            </button>
            <button
              onClick={() => {
                setMode('forgot');
                setError('');
              }}
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="account-page">
      <div className="page-heading" style={{ padding: '0 0 30px' }}>
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h1>Hello, {user.name.split(' ')[0]}.</h1>
        <p>A home for your favourites, your orders, and your next thoughtful find.</p>
      </div>
      <div className="account-grid">
        <nav className="account-nav">
          {['Orders', 'Addresses', 'Profile', 'Reviews'].map((t) => (
            <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
          <Link href="/wishlist">Wishlist</Link>
          <button
            onClick={async () => {
              await api('auth/logout', { method: 'POST' });
              await refresh('identity');
            }}
          >
            Sign out
          </button>
        </nav>
        <div>
          {tab === 'Orders' &&
            (!orders?.length ? (
              <div className="empty">
                <h2>Your story is just beginning.</h2>
                <p>Your orders will appear here.</p>
                <Link href="/shop" className="button">
                  Explore the collection
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <header>
                    <div>
                      <h3>{order.number}</h3>
                      <p>
                        {new Date(order.createdAt).toLocaleDateString('en-IN')} · {currency(order.total)}
                      </p>
                    </div>
                    <span className="badge">{order.status.replaceAll('_', ' ')}</span>
                  </header>
                  <div className="order-images">
                    {order.items.map((item) => (
                      <Image src={item.image} alt={item.title} width={65} height={80} key={item.id} />
                    ))}
                  </div>
                  <Link href={`/orders/${order.id}`} className="text-link">
                    View your order <ArrowRight size={14} />
                  </Link>
                </article>
              ))
            ))}
          {tab === 'Addresses' && (
            <>
              <h2 className="serif" style={{ fontSize: 32 }}>
                Places called home.
              </h2>
              {addresses?.map((address) => (
                <div className="order-card" key={address.id}>
                  <h3>{address.name}</h3>
                  <p>
                    {address.line1}
                    <br />
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <button
                    className="text-link"
                    onClick={async () => {
                      await api(`addresses/${address.id}`, { method: 'DELETE' });
                      refresh('addresses');
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  const form = Object.fromEntries(new FormData(e.currentTarget));
                  try {
                    await api('addresses', {
                      method: 'POST',
                      body: JSON.stringify({ ...form, country: 'IN' }),
                    });
                    refresh('addresses');
                    setSuccess('Address saved.');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <div className="form-grid">
                  {[
                    ['name', 'Full name'],
                    ['phone', 'Phone'],
                    ['line1', 'Street address'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['postalCode', 'PIN code'],
                  ].map(([key, label]) => (
                    <label className="field" key={key}>
                      {label}
                      <input name={key} required />
                    </label>
                  ))}
                </div>
                <button className="button">Save address</button>
              </form>
            </>
          )}
          {tab === 'Profile' && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await api('customers/me', {
                    method: 'PATCH',
                    body: JSON.stringify({ name: f.get('name'), newsletter: f.get('newsletter') === 'on' }),
                  });
                  refresh('identity');
                  setSuccess('Your details have been saved.');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <h2 className="serif" style={{ fontSize: 32 }}>
                A little about you.
              </h2>
              <label className="field">
                Name
                <input name="name" defaultValue={user.name} required minLength={2} />
              </label>
              <label className="field">
                Email
                <input value={user.email} readOnly />
              </label>
              <label>
                <input type="checkbox" name="newsletter" /> Send me occasional letters from the makers.
              </label>
              <button className="button">Save your details</button>
            </form>
          )}
          {tab === 'Reviews' && (
            <>
              <h2 className="serif" style={{ fontSize: 32 }}>
                Share a little of your story.
              </h2>
              <p className="muted">
                Reviews can be submitted for delivered pieces. They appear after moderation.
              </p>
              {orders
                ?.filter((o) => o.status === 'DELIVERED')
                .flatMap((o) => o.items)
                .map((item) => (
                  <form
                    key={item.id}
                    className="order-card stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      try {
                        await api('reviews', {
                          method: 'POST',
                          body: JSON.stringify({
                            productId: (item as unknown as { productId: string }).productId,
                            rating: Number(form.get('rating')),
                            title: form.get('title'),
                            body: form.get('body'),
                          }),
                        });
                        setSuccess('Thank you. Your review is awaiting moderation.');
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <h3>{item.title}</h3>
                    <label className="field">
                      Rating
                      <select name="rating">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      A few words
                      <input name="title" required minLength={3} />
                    </label>
                    <label className="field">
                      Your experience
                      <textarea name="body" required minLength={10} />
                    </label>
                    <button className="button">Share your review</button>
                  </form>
                ))}
            </>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="success-message" role="status">
              {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="empty">Opening your account…</div>}>
      <Account />
    </Suspense>
  );
}

'use client';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Package } from 'lucide-react';
import { currency } from '@mitti/commerce';
import type { Order } from '@mitti/types';
import { api } from '@/lib/api';
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}
export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    data: order,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<Order>(`orders/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'PENDING_PAYMENT' ? 5000 : false),
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [mock, setMock] = useState(false);
  async function pay() {
    setBusy(true);
    setMessage('');
    try {
      const p = await api<{
        provider: string;
        providerOrderId: string;
        keyId?: string;
        amount: number;
        currency: string;
      }>(`orders/${id}/payment`, { method: 'POST' });
      if (p.provider === 'mock') {
        setMock(true);
        return;
      }
      if (!window.Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Payment checkout could not load'));
          document.body.appendChild(script);
        });
      new window.Razorpay({
        key: p.keyId,
        amount: p.amount,
        currency: p.currency,
        order_id: p.providerOrderId,
        name: 'Mitti & Thread',
        prefill: { email: order?.email },
        handler: () => {
          setMessage('Payment submitted. Waiting for secure confirmation…');
          void refetch();
        },
        theme: { color: '#9e4f35' },
      }).open();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mockPay() {
    setBusy(true);
    try {
      await api(`orders/${id}/mock-payment`, { method: 'POST' });
      setMock(false);
      await refetch();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <div className="empty">Opening your order…</div>;
  if (error || !order)
    return (
      <div className="empty">
        <h2>We couldn’t find this order.</h2>
        <p>Open it in the browser you used at checkout, or sign in to your account.</p>
        <Link href="/account" className="button">
          Your account
        </Link>
      </div>
    );
  return (
    <div className="order-detail-page">
      <span className="eyebrow">{order.number}</span>
      <h1>
        {order.status === 'PENDING_PAYMENT'
          ? 'One last thoughtful step.'
          : order.status === 'CANCELLED'
            ? 'This reservation has ended.'
            : 'Good things are on their way.'}
      </h1>
      <p className="muted">
        {order.status === 'PENDING_PAYMENT'
          ? 'Your pieces are reserved for 20 minutes. Complete payment to confirm your order.'
          : `Order updates will be sent to ${order.email}.`}
      </p>
      <div className="order-card">
        <header>
          <div className="badge">{order.status.replaceAll('_', ' ')}</div>
          <strong>{currency(order.total)}</strong>
        </header>
        {order.items.map((item) => (
          <div className="checkout-item" key={item.id}>
            <Image src={item.image} alt={item.title} width={65} height={80} />
            <div>
              {item.title}
              <p>
                {item.variantName} · Qty {item.quantity}
              </p>
              {Object.entries(item.customization).map(([key, value]) => (
                <p key={key}>{value}</p>
              ))}
            </div>
            <span>{currency(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span>{currency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div>
              <span>Discount</span>
              <span>−{currency(order.discount)}</span>
            </div>
          )}
          <div>
            <span>Shipping</span>
            <span>{order.shipping ? currency(order.shipping) : 'Complimentary'}</span>
          </div>
          <div>
            <span>Total</span>
            <span>{currency(order.total)}</span>
          </div>
        </div>
      </div>
      {order.status === 'PENDING_PAYMENT' &&
        (mock ? (
          <div className="order-card">
            <h2>Development payment</h2>
            <p>This is the local mock payment provider. No money will be charged.</p>
            <button className="button" onClick={mockPay} disabled={busy}>
              Simulate successful payment <Check size={17} />
            </button>
          </div>
        ) : (
          <button className="button" onClick={pay} disabled={busy}>
            {busy ? 'Opening checkout…' : `Pay ${currency(order.total)}`}
            <ArrowRight size={17} />
          </button>
        ))}
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
      <section style={{ marginTop: 35 }}>
        <h2 className="serif" style={{ fontSize: 32 }}>
          Your piece’s journey.
        </h2>
        <ul className="order-timeline">
          {order.events.map((event) => (
            <li key={event.id}>
              {event.type.replaceAll('_', ' ').toLowerCase()}
              <small>{new Date(event.createdAt).toLocaleString('en-IN')}</small>
            </li>
          ))}
        </ul>
        {order.shipments.map((s) => (
          <p key={s.trackingNumber}>
            <Package size={16} /> Tracking: {s.trackingNumber}
          </p>
        ))}
      </section>
      {!['PENDING_PAYMENT', 'CANCELLED'].includes(order.status) && (
        <p className="muted">
          Keep your story in one place.{' '}
          <Link href="/account" className="text-link">
            Create an account
          </Link>
        </p>
      )}
      <Link href="/shop" className="text-link">
        A little more inspiration <ArrowRight size={15} />
      </Link>
    </div>
  );
}

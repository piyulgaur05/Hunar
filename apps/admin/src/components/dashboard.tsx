'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  IndianRupee,
  ShoppingBag,
  Users,
  Receipt,
  CalendarDays,
  CircleAlert,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { currency } from '@mitti/commerce';
import { api } from '@/lib/api';
import { PageHeader, StatusBadge } from './ui';
type DashboardData = {
  revenue: number;
  orderCount: number;
  aov: number;
  customers: number;
  daily: { day: string; revenue: number }[];
  recent: { id: string; number: string; email: string; total: number; status: string; createdAt: string }[];
  lowStock: { id: string; available: number; variant: { name: string; product: { title: string } } }[];
  statuses: { status: string; _count: number }[];
  events: { type: string; _count: number }[];
  topItems: { title: string; _sum: { quantity: number } }[];
};
export function Dashboard({ analytics = false }: { analytics?: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('admin/dashboard'),
  });
  if (isLoading) return <div className="admin-loading">Gathering your shop’s latest numbers…</div>;
  if (error || !data) return <p className="error-message">{error?.message || 'Dashboard unavailable'}</p>;
  const stats = [
    ['Total revenue', currency(data.revenue), IndianRupee, 'Payments received in the last 30 days'],
    ['Orders', String(data.orderCount), ShoppingBag, 'Confirmed orders this month'],
    ['Average order value', currency(data.aov), Receipt, 'A little more meaning in every bag'],
    ['Customers', String(data.customers), Users, 'People in your community'],
  ] as const;
  return (
    <>
      <PageHeader
        eyebrow="YOUR STORE, AT A GLANCE"
        title={analytics ? 'The story in your numbers.' : 'A good day to make good things.'}
        description={
          analytics ? 'A clear view of your shop’s performance.' : 'Here’s what’s happening at Hunaré today.'
        }
        action={
          <div className="date-range">
            <CalendarDays size={15} />
            Last 30 days
          </div>
        }
      />
      <div className="overview-banner">
        <div>
          <span className="banner-seal">m.</span>
          <div>
            <strong>Small batches. Meaningful moments.</strong>
            <p>Your next beautiful chapter starts with a well-run shop.</p>
          </div>
        </div>
        <Link href="/products/new">
          Add a new piece <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, Icon, note]) => (
          <article className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-middle">
        <section className="admin-panel revenue-panel">
          <header>
            <div>
              <h2>Revenue over time</h2>
              <p>A little progress, every day.</p>
            </div>
            <span className="chart-legend">Revenue</span>
          </header>
          <div className="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ top: 15, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b38366" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#b38366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eeeae3" strokeDasharray="3 4" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#8c8b81' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tickFormatter={(n) => `₹${n / 100000}k`}
                  tick={{ fontSize: 10, fill: '#8c8b81' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [currency(Number(value)), 'Revenue']}
                  contentStyle={{ fontSize: 12, border: '1px solid #e5e2da' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#a27559"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="admin-panel order-breakdown">
          <header>
            <div>
              <h2>Orders, in motion</h2>
              <p>From your studio to their doorstep.</p>
            </div>
          </header>
          <div className="order-total">
            <ShoppingBag size={30} strokeWidth={1} />
            <strong>{data.statuses.reduce((n, s) => n + s._count, 0)}</strong>
            <span>Total orders</span>
          </div>
          <div className="status-bars">
            {data.statuses.map((s, i) => (
              <div key={s.status}>
                <span>
                  <i style={{ background: ['#7e8972', '#c29b75', '#777d80', '#b8af9b', '#a37259'][i % 5] }} />
                  {s.status.toLowerCase().replaceAll('_', ' ')}
                </span>
                <strong>{s._count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="admin-panel recent-orders">
          <header>
            <div>
              <h2>Recent orders</h2>
              <p>Thoughtful finds, on their way.</p>
            </div>
            <Link href="/orders">
              View all <ArrowRight size={14} />
            </Link>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders?order=${o.id}`} className="table-link">
                        {o.number}
                      </Link>
                    </td>
                    <td>
                      <span className="customer-email">{o.email}</span>
                      <small>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </small>
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>{currency(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel low-stock">
          <header>
            <div>
              <h2>
                <CircleAlert size={16} />A little attention needed
              </h2>
              <p>Small batches running low.</p>
            </div>
          </header>
          {data.lowStock.slice(0, 4).map((item) => (
            <div className="stock-alert" key={item.id}>
              <span className="stock-icon">
                <ShoppingBag size={18} strokeWidth={1} />
              </span>
              <div>
                <strong>{item.variant.product.title}</strong>
                <p>{item.variant.name}</p>
              </div>
              <span>{item.available} left</span>
            </div>
          ))}
          {!data.lowStock.length && <div className="empty">Your inventory is looking healthy.</div>}
          <Link href="/inventory" className="panel-bottom-link">
            Review inventory <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      {analytics && (
        <div className="dashboard-middle">
          <section className="admin-panel">
            <header>
              <h2>Top pieces</h2>
            </header>
            {data.topItems.map((item) => (
              <div className="metric-row" key={item.title}>
                <span>{item.title}</span>
                <strong>{item._sum.quantity} sold</strong>
              </div>
            ))}
          </section>
          <section className="admin-panel">
            <header>
              <h2>Shopping activity</h2>
            </header>
            {data.events.length ? (
              data.events.map((event) => (
                <div className="metric-row" key={event.type}>
                  <span>{event.type.replaceAll('_', ' ')}</span>
                  <strong>{event._count}</strong>
                </div>
              ))
            ) : (
              <div className="empty">Events appear as customers explore the storefront.</div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

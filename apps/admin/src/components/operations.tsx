'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Plus, Save, ArrowUpRight, Upload, Download } from 'lucide-react';
import { currency, orderTransitions } from '@mitti/commerce';
import type { Order, CmsSection, Taxonomy } from '@mitti/types';
import { api } from '@/lib/api';
import { DataTable, PageHeader, StatusBadge, Modal } from './ui';
import { Dashboard } from './dashboard';
function exportCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let value = String(v ?? '');
    if (/^[=+@-]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const blob = new Blob(
    [
      [keys.map(cell).join(','), ...rows.map((row) => keys.map((key) => cell(row[key])).join(','))].join(
        '\n',
      ),
    ],
    { type: 'text/csv;charset=utf-8;' },
  );
  const href = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
  URL.revokeObjectURL(href);
}
export function Operations({ section }: { section: string }) {
  if (section === 'analytics') return <Dashboard analytics />;
  if (section === 'orders') return <Orders />;
  if (section === 'content') return <Content />;
  if (section === 'inventory') return <Inventory />;
  if (section === 'promotions') return <Promotions />;
  if (section === 'media') return <Media />;
  if (section === 'settings') return <Settings />;
  if (section === 'users') return <Team />;
  return <Records section={section} />;
}
function Orders() {
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api<Order[]>('admin/orders'),
  });
  const [selected, setSelected] = useState<Order | null>(null),
    [status, setStatus] = useState(''),
    [tracking, setTracking] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader
        title="Thoughtful finds, on their way."
        description="Follow every order from payment to their doorstep."
        action={
          <button
            className="button light"
            onClick={() =>
              exportCsv(
                (data || []).map((o) => ({
                  number: o.number,
                  email: o.email,
                  status: o.status,
                  totalPaise: o.total,
                  createdAt: o.createdAt,
                })),
                'orders.csv',
              )
            }
          >
            <Download size={15} />
            Export orders
          </button>
        }
      />
      {error ? (
        <p className="error-message">{error.message}</p>
      ) : isLoading ? (
        <p>Opening orders…</p>
      ) : (
        <DataTable
          data={data || []}
          searchPlaceholder="Search orders or customers…"
          columns={[
            {
              accessorKey: 'number',
              header: 'Order',
              cell: ({ row }) => (
                <button
                  className="table-link"
                  onClick={() => {
                    setSelected(row.original);
                    setStatus('');
                    setMessage('');
                  }}
                >
                  {row.original.number}
                </button>
              ),
            },
            { accessorKey: 'email', header: 'Customer' },
            {
              accessorKey: 'createdAt',
              header: 'Placed',
              cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString('en-IN'),
            },
            {
              accessorKey: 'status',
              header: 'Status',
              cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
            },
            { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => currency(Number(getValue())) },
            {
              id: 'Open',
              header: '',
              cell: ({ row }) => (
                <button
                  className="icon-button"
                  aria-label={`Open ${row.original.number}`}
                  onClick={() => {
                    setSelected(row.original);
                    setStatus('');
                    setMessage('');
                  }}
                >
                  <ArrowUpRight size={17} />
                </button>
              ),
            },
          ]}
        />
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.number || 'Order'}
        description={selected?.email || ''}
      >
        {selected && (
          <>
            <StatusBadge status={selected.status} />
            <div className="modal-order-items">
              {selected.items.map((item) => (
                <div className="table-product" key={item.id}>
                  <Image src={item.image} alt={item.title} width={50} height={60} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.variantName} · {item.quantity} × {currency(item.unitPrice)}
                    </small>
                    {Object.entries(item.customization).map(([key, value]) => (
                      <small key={key}>
                        {key}: {value}
                      </small>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="form-grid">
              <div>
                <h3>Deliver to</h3>
                <p>
                  {selected.addresses[0]?.name}
                  <br />
                  {selected.addresses[0]?.line1}
                  <br />
                  {selected.addresses[0]?.city}, {selected.addresses[0]?.postalCode}
                  <br />
                  {selected.addresses[0]?.phone}
                </p>
              </div>
              <div>
                <h3>Order total</h3>
                <strong>{currency(selected.total)}</strong>
                <p>
                  Shipping {currency(selected.shipping)}
                  <br />
                  Discount {currency(selected.discount)}
                </p>
              </div>
            </div>
            <ol className="admin-timeline">
              {selected.events.map((event) => (
                <li key={event.id}>
                  {event.type.replaceAll('_', ' ')}
                  <small>{new Date(event.createdAt).toLocaleString('en-IN')}</small>
                </li>
              ))}
            </ol>
            <label className="field">
              Next step
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Choose an action</option>
                {(orderTransitions[selected.status] || [])
                  .filter(
                    (s) =>
                      !['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(s) &&
                      (s !== 'CANCELLED' || selected.status === 'PENDING_PAYMENT'),
                  )
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
            </label>
            {status === 'SHIPPED' && (
              <label className="field">
                Tracking number
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </label>
            )}
            {message && <p className="error-message">{message}</p>}
            <button
              className="button"
              disabled={!status || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api<Order>(`admin/orders/${selected.id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      status,
                      ...(status === 'SHIPPED' ? { trackingNumber: tracking } : {}),
                    }),
                  });
                  setSelected(result);
                  setStatus('');
                  await client.invalidateQueries({ queryKey: ['admin-orders'] });
                  await client.invalidateQueries({ queryKey: ['dashboard'] });
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Updating…' : 'Update order'}
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
function Content() {
  const { data, refetch, error } = useQuery({
    queryKey: ['content'],
    queryFn: () => api<CmsSection[]>('admin/content'),
  });
  const [selected, setSelected] = useState<CmsSection | null>(null),
    [message, setMessage] = useState('');
  return (
    <>
      <PageHeader
        title="Your storefront, your story."
        description="Shape the homepage without touching a line of code."
      />
      {error && <p className="error-message">{error.message}</p>}
      <div className="content-sections">
        {data?.map((section) => (
          <article className="content-section" key={section.id}>
            <span className="section-position">{String(section.position + 1).padStart(2, '0')}</span>
            <div>
              <span className="eyebrow">{section.type}</span>
              <h2>{section.title.replaceAll('\n', ' ')}</h2>
              <StatusBadge status={section.enabled ? section.status : 'HIDDEN'} />
            </div>
            <button
              className="button light"
              onClick={() => {
                setSelected(section);
                setMessage('');
              }}
            >
              Edit section <ArrowUpRight size={14} />
            </button>
          </article>
        ))}
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Shape this part of your story."
        description="Published, enabled sections appear in their chosen order."
      >
        {selected && (
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const { id: _id, type: _type, ...data } = selected;
              try {
                await api(`admin/content/${selected.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    title: data.title,
                    content: data.content,
                    position: data.position,
                    enabled: data.enabled,
                    status: data.status,
                    startsAt: data.startsAt,
                    endsAt: data.endsAt,
                  }),
                });
                await refetch();
                setSelected(null);
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <label className="field">
              Heading
              <textarea
                value={selected.title}
                onChange={(e) => setSelected({ ...selected, title: e.target.value })}
              />
            </label>
            {Object.entries(selected.content).map(([key, value]) => (
              <label className="field" key={key}>
                {key}
                <textarea
                  value={value}
                  onChange={(e) =>
                    setSelected({ ...selected, content: { ...selected.content, [key]: e.target.value } })
                  }
                />
              </label>
            ))}
            <div className="form-grid">
              <label className="field">
                Order
                <input
                  type="number"
                  min={0}
                  value={selected.position}
                  onChange={(e) => setSelected({ ...selected, position: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Status
                <select
                  value={selected.status}
                  onChange={(e) => setSelected({ ...selected, status: e.target.value })}
                >
                  <option>PUBLISHED</option>
                  <option>DRAFT</option>
                </select>
              </label>
              <label className="field">
                Start date
                <input
                  type="datetime-local"
                  value={selected.startsAt?.slice(0, 16) || ''}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </label>
              <label className="field">
                End date
                <input
                  type="datetime-local"
                  value={selected.endsAt?.slice(0, 16) || ''}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </label>
            </div>
            <label>
              <input
                type="checkbox"
                checked={selected.enabled}
                onChange={(e) => setSelected({ ...selected, enabled: e.target.checked })}
              />
              Show this section
            </label>
            {message && <p className="error-message">{message}</p>}
            <button className="button">
              <Save size={15} />
              Save section
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
type InventoryRecord = {
  id: string;
  available: number;
  reserved: number;
  sold: number;
  lowStockThreshold: number;
  variant: { sku: string; name: string; product: { title: string } };
};
function Inventory() {
  const { data, error, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api<InventoryRecord[]>('admin/inventory'),
  });
  const [selected, setSelected] = useState<InventoryRecord | null>(null),
    [message, setMessage] = useState('');
  return (
    <>
      <PageHeader
        title="Every piece, accounted for."
        description="Keep your small batches in good hands. Reserved stock is managed by checkout."
      />
      {error && <p className="error-message">{error.message}</p>}
      <DataTable
        data={data || []}
        searchPlaceholder="Search a piece or SKU…"
        columns={[
          {
            id: 'Product',
            accessorFn: (r) => r.variant.product.title,
            header: 'Product',
            cell: ({ row }) => (
              <div>
                <strong>{row.original.variant.product.title}</strong>
                <small>{row.original.variant.name}</small>
              </div>
            ),
          },
          { id: 'SKU', accessorFn: (r) => r.variant.sku, header: 'SKU' },
          {
            accessorKey: 'available',
            header: 'Available',
            cell: ({ row }) => (
              <span
                className={row.original.available <= row.original.lowStockThreshold ? 'stock-warning' : ''}
              >
                {row.original.available}
              </span>
            ),
          },
          { accessorKey: 'reserved', header: 'Reserved' },
          { accessorKey: 'sold', header: 'Sold' },
          {
            id: 'Adjust',
            header: '',
            cell: ({ row }) => (
              <button
                className="table-link"
                onClick={() => {
                  setSelected(row.original);
                  setMessage('');
                }}
              >
                Adjust stock
              </button>
            ),
          },
        ]}
      />
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="A considered stock adjustment."
        description={`${selected?.variant.product.title || ''} · ${selected?.available || 0} currently available`}
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            try {
              await api(`admin/inventory/${selected!.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  adjustment: Number(form.get('adjustment')),
                  reason: form.get('reason'),
                }),
              });
              await refetch();
              setSelected(null);
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="field">
            Add or remove pieces
            <input type="number" name="adjustment" required placeholder="e.g. 10 or -2" />
          </label>
          <label className="field">
            Reason
            <input name="reason" required minLength={3} placeholder="New batch received" />
          </label>
          {message && <p className="error-message">{message}</p>}
          <button className="button">Save adjustment</button>
        </form>
      </Modal>
    </>
  );
}
type Coupon = {
  id: string;
  code: string;
  percent: number;
  minimum: number;
  maxDiscount: number | null;
  maxUses: number | null;
  used: number;
  active: boolean;
  expiresAt: string | null;
};
function Promotions() {
  const { data, error, refetch } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api<Coupon[]>('admin/promotions'),
  });
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState('');
  return (
    <>
      <PageHeader
        title="A little extra reason to give."
        description="Create considered offers for your community."
        action={
          <button className="button" onClick={() => setOpen(true)}>
            <Plus size={15} />
            Create coupon
          </button>
        }
      />
      {error && <p className="error-message">{error.message}</p>}
      <DataTable
        data={data || []}
        columns={[
          { accessorKey: 'code', header: 'Code' },
          { accessorKey: 'percent', header: 'Discount', cell: ({ getValue }) => `${getValue()}%` },
          {
            accessorKey: 'minimum',
            header: 'Minimum order',
            cell: ({ getValue }) => currency(Number(getValue())),
          },
          { accessorKey: 'used', header: 'Uses' },
          {
            id: 'Status',
            header: 'Status',
            cell: ({ row }) => (
              <button
                className="table-link"
                onClick={async () => {
                  const { id, used: _used, ...coupon } = row.original;
                  try {
                    await api(`admin/promotions/${id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ ...coupon, active: !coupon.active }),
                    });
                    await refetch();
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                {row.original.active ? 'Active · disable' : 'Disabled · enable'}
              </button>
            ),
          },
        ]}
      />
      {message && <p className="error-message">{message}</p>}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="A thoughtful little offer."
        description="All coupon amounts are confirmed on the server at checkout."
      >
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api('admin/promotions', {
                method: 'POST',
                body: JSON.stringify({
                  code: String(f.get('code')).toUpperCase(),
                  percent: Number(f.get('percent')),
                  minimum: Math.round(Number(f.get('minimum')) * 100),
                  maxUses: Number(f.get('maxUses')) || null,
                  active: true,
                }),
              });
              await refetch();
              setOpen(false);
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="field">
            Code
            <input name="code" required minLength={3} placeholder="A LITTLE THANK YOU" />
          </label>
          <label className="field">
            Discount (%)
            <input name="percent" type="number" min={1} max={80} required />
          </label>
          <label className="field">
            Minimum order (₹)
            <input name="minimum" type="number" min={0} defaultValue={0} />
          </label>
          <label className="field">
            Maximum uses (optional)
            <input name="maxUses" type="number" min={1} />
          </label>
          {message && <p className="error-message">{message}</p>}
          <button className="button">Create coupon</button>
        </form>
      </Modal>
    </>
  );
}
function Media() {
  const { data, error, refetch } = useQuery({
    queryKey: ['media'],
    queryFn: () =>
      api<{ id: string; url: string; alt: string; size: number; variants: Record<string, string> }[]>(
        'media',
      ),
  });
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader
        title="A library of little details."
        description="Optimized images, ready to tell your story."
      />
      {error && <p className="error-message">{error.message}</p>}
      <label className="upload-zone">
        <Upload size={25} />
        <strong>{busy ? 'Preparing your image…' : 'Add a photograph'}</strong>
        <span>JPEG, PNG, WebP or AVIF · Up to 8 MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage('');
            try {
              const f = new FormData();
              f.set('file', file);
              f.set('alt', file.name.replace(/\.[^.]+$/, ''));
              await api('media', { method: 'POST', body: f });
              await refetch();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {message && <p className="error-message">{message}</p>}
      <div className="media-grid">
        {data?.map((asset) => (
          <article className="media-card" key={asset.id}>
            <Image src={asset.url} alt={asset.alt} width={300} height={300} />
            <div>
              <strong>{asset.alt}</strong>
              <small>
                {Math.round(asset.size / 1024)} KB · WebP · {Object.keys(asset.variants).length} responsive
                sizes
              </small>
              <button
                className="table-link"
                onClick={async () => {
                  await navigator.clipboard.writeText(asset.url);
                  setMessage('Image URL copied.');
                }}
              >
                Copy image URL
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function Settings() {
  const { data, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<{ key: string; value: string }[]>('admin/settings'),
  });
  const [message, setMessage] = useState('');
  return (
    <>
      <PageHeader
        title="The details behind your store."
        description="Keep your customer-facing information up to date."
      />
      {error && <p className="error-message">{error.message}</p>}
      <div className="settings-list">
        {['announcement', 'contactEmail', 'shippingPolicy', 'returnsPolicy'].map((key) => (
          <form
            className="form-section"
            key={key}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(`admin/settings/${key}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ value: new FormData(e.currentTarget).get('value') }),
                });
                await refetch();
                setMessage('Setting saved.');
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            <h2>{key.replace(/([A-Z])/g, ' $1')}</h2>
            <label className="field">
              Content
              <textarea
                name="value"
                defaultValue={data?.find((s) => s.key === key)?.value || ''}
                key={data?.find((s) => s.key === key)?.value}
              />
            </label>
            <button className="button light">
              <Save size={14} />
              Save setting
            </button>
          </form>
        ))}
      </div>
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
    </>
  );
}
function Team() {
  const { data, error, refetch } = useQuery({
    queryKey: ['team'],
    queryFn: () =>
      api<{
        users: { id: string; name: string; email: string; roles: { role: { name: string } }[] }[];
        roles: { id: string; name: string }[];
      }>('admin/users'),
  });
  const [message, setMessage] = useState('');
  return (
    <>
      <PageHeader
        title="Good people, clear permissions."
        description="Assign roles to existing accounts. Permissions are enforced by the API."
      />
      {error && <p className="error-message">{error.message}</p>}
      <DataTable
        data={data?.users || []}
        columns={[
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'email', header: 'Email' },
          {
            id: 'Roles',
            header: 'Roles',
            cell: ({ row }) => row.original.roles.map((r) => r.role.name).join(', '),
          },
        ]}
      />
      <form
        className="form-section stack"
        style={{ marginTop: 25 }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api('admin/users/role', {
              method: 'POST',
              body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
            });
            await refetch();
            setMessage('Team role updated.');
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <h2>Update a team member’s access</h2>
        <div className="form-grid">
          <label className="field">
            Existing account email
            <input type="email" name="email" required />
          </label>
          <label className="field">
            Role
            <select name="roleId" required>
              {data?.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button">Update role</button>
        {message && <p role="status">{message}</p>}
      </form>
    </>
  );
}
function Records({ section }: { section: string }) {
  const endpoint = section === 'collections' ? 'collections' : `admin/${section}`;
  const { data, error, refetch } = useQuery({ queryKey: [section], queryFn: () => api<any[]>(endpoint) });
  if (section === 'collections')
    return (
      <>
        <PageHeader
          title="Beautiful things, brought together."
          description="Your considered collections, as they appear in the shop."
        />
        <div className="media-grid">
          {(data as Taxonomy[] | undefined)?.map((collection) => (
            <article className="media-card" key={collection.id}>
              <Image src={collection.image} alt={collection.name} width={300} height={300} />
              <div>
                <h2>{collection.name}</h2>
                <p>{collection.description}</p>
                <a
                  className="table-link"
                  href={`http://localhost:3000/collections/${collection.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View collection <ArrowUpRight size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  const columns =
    section === 'customers'
      ? [
          { accessorKey: 'name', header: 'Customer' },
          { accessorKey: 'email', header: 'Email' },
          { id: 'Orders', accessorFn: (r: any) => r._count.orders, header: 'Orders' },
          {
            accessorKey: 'createdAt',
            header: 'Joined',
            cell: ({ getValue }: any) => new Date(getValue()).toLocaleDateString('en-IN'),
          },
        ]
      : section === 'reviews'
        ? [
            { id: 'Product', accessorFn: (r: any) => r.product.title, header: 'Product' },
            { id: 'Customer', accessorFn: (r: any) => r.user.name, header: 'Customer' },
            { accessorKey: 'rating', header: 'Rating' },
            { accessorKey: 'title', header: 'Review' },
            {
              id: 'Moderation',
              header: 'Moderation',
              cell: ({ row }: any) => (
                <button
                  className="table-link"
                  onClick={async () => {
                    await api(`admin/reviews/${row.original.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ approved: !row.original.approved }),
                    });
                    await refetch();
                  }}
                >
                  {row.original.approved ? 'Published · hide' : 'Pending · publish'}
                </button>
              ),
            },
          ]
        : [
            { accessorKey: 'action', header: 'Action' },
            { accessorKey: 'resource', header: 'Resource' },
            { accessorKey: 'actorId', header: 'Actor' },
            {
              accessorKey: 'createdAt',
              header: 'When',
              cell: ({ getValue }: any) => new Date(getValue()).toLocaleString('en-IN'),
            },
          ];
  return (
    <>
      <PageHeader
        title={
          section === 'customers'
            ? 'The people in your story.'
            : section === 'reviews'
              ? 'Words from the community.'
              : 'Every important change, recorded.'
        }
        description={
          section === 'customers'
            ? 'A little context for every customer.'
            : section === 'reviews'
              ? 'Review and moderate customer feedback.'
              : 'A chronological record of administrative activity.'
        }
        action={
          section === 'customers' ? (
            <button
              className="button light"
              onClick={() =>
                exportCsv(
                  (data || []).map(({ name, email }) => ({ name, email })),
                  'customers.csv',
                )
              }
            >
              <Download size={15} />
              Export customers
            </button>
          ) : undefined
        }
      />
      {error ? (
        <p className="error-message">{error.message}</p>
      ) : (
        <DataTable data={data || []} columns={columns} />
      )}
    </>
  );
}

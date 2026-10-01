'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Save, Plus, Upload, Trash2, ArrowLeft, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product, Taxonomy } from '@mitti/types';
import { productSchema, type ProductInput } from '@mitti/validation';
import { api } from '@/lib/api';
import { PageHeader, Modal } from '../ui';
const blank: ProductInput = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  categoryId: '',
  artisan: '',
  origin: '',
  materials: '',
  care: '',
  dimensions: '',
  status: 'DRAFT',
  featured: false,
  images: [],
  variants: [{ sku: '', name: 'Natural', price: 100, stock: 0, weightGrams: 500, active: true }],
  customizations: [],
};
function toInput(p: Product): ProductInput {
  return {
    title: p.title,
    slug: p.slug,
    subtitle: p.subtitle,
    description: p.description,
    categoryId: p.categoryId,
    artisan: p.artisan,
    origin: p.origin,
    materials: p.materials,
    care: p.care,
    dimensions: p.dimensions,
    status: p.status as ProductInput['status'],
    featured: p.featured,
    seoTitle: p.seoTitle || '',
    seoDescription: p.seoDescription || '',
    images: p.images.map(({ url, alt, position }) => ({ url, alt, position })),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.inventory?.available || 0,
      weightGrams: 500,
      active: v.active,
    })),
    customizations: p.customizations.map(
      ({ key, label, type, required, maxLength, options, priceAdjustment }) => ({
        key,
        label,
        type: type as ProductInput['customizations'][number]['type'],
        required,
        maxLength,
        options,
        priceAdjustment,
      }),
    ),
  };
}
export function ProductEditor({ id }: { id: string }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`admin/products/${id}`),
    enabled: id !== 'new',
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Taxonomy[]>('categories'),
  });
  if (id !== 'new' && isLoading) return <div className="admin-loading">Opening the product studio…</div>;
  if (id !== 'new' && !product) return <p className="error-message">This product could not be opened.</p>;
  return (
    <EditorForm
      key={product?.id || 'new'}
      initial={product ? toInput(product) : blank}
      id={id}
      categories={categories || []}
    />
  );
}
function EditorForm({
  initial,
  id,
  categories,
}: {
  initial: ProductInput;
  id: string;
  categories: Taxonomy[];
}) {
  const [data, setData] = useState<ProductInput>(initial),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const router = useRouter(),
    client = useQueryClient();
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));
  async function save(duplicate = false) {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const value = duplicate
        ? {
            ...data,
            title: `${data.title} — Copy`,
            slug: `${data.slug}-copy-${Date.now().toString(36)}`,
            status: 'DRAFT' as const,
            variants: data.variants.map(({ id: _id, ...v }) => ({
              ...v,
              sku: `${v.sku}-${Date.now().toString(36)}`,
            })),
          }
        : data;
      const validated = productSchema.parse(value);
      const result = await api<{ id: string }>(
        id === 'new' || duplicate ? 'admin/products' : `admin/products/${id}`,
        { method: id === 'new' || duplicate ? 'POST' : 'PATCH', body: JSON.stringify(validated) },
      );
      await client.invalidateQueries({ queryKey: ['products'] });
      setSuccess('Your piece has been saved.');
      if (id === 'new' || duplicate) router.push(`/products/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', data.title || 'Handcrafted product');
      const asset = await api<{ url: string }>('media', { method: 'POST', body: form });
      set('images', [
        ...data.images,
        { url: asset.url, alt: data.title || 'Handcrafted product', position: data.images.length },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function moveImage(index: number, delta: number) {
    const images = [...data.images];
    [images[index], images[index + delta]] = [images[index + delta], images[index]];
    set(
      'images',
      images.map((image, position) => ({ ...image, position })),
    );
  }
  return (
    <>
      <Link className="back-link" href="/products">
        <ArrowLeft size={15} />
        Back to products
      </Link>
      <PageHeader
        title={id === 'new' ? 'A new story starts here.' : data.title}
        description="The details make all the difference."
        action={
          <div className="action-group">
            {id !== 'new' && (
              <button className="button light" onClick={() => save(true)} disabled={busy}>
                <Copy size={14} />
                Duplicate
              </button>
            )}
            <button className="button" onClick={() => save()} disabled={busy}>
              <Save size={15} />
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </div>
        }
      />
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
      <div className="editor-grid">
        <div className="stack">
          <section className="form-section">
            <h2>The essentials</h2>
            <label className="field">
              Product title
              <input
                value={data.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setData({
                    ...data,
                    title,
                    ...(id === 'new'
                      ? {
                          slug: title
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/-$/, ''),
                        }
                      : {}),
                  });
                }}
                placeholder="A name with a little character"
              />
            </label>
            <label className="field">
              Short description
              <input
                value={data.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
                placeholder="Wheel-thrown stoneware, made in Jaipur"
              />
            </label>
            <label className="field">
              The story
              <textarea
                value={data.description}
                onChange={(e) => set('description', e.target.value)}
                rows={6}
              />
            </label>
          </section>
          <section className="form-section">
            <h2>Through the lens</h2>
            <p>JPEG, PNG, WebP or AVIF. Up to 8 MB. Images are optimized automatically.</p>
            <div className="editor-media">
              {data.images.map((image, i) => (
                <div key={image.url}>
                  <Image src={image.url} alt={image.alt} width={150} height={160} />
                  <input
                    aria-label={`Image ${i + 1} alt text`}
                    value={image.alt}
                    onChange={(e) =>
                      set(
                        'images',
                        data.images.map((x, n) => (n === i ? { ...x, alt: e.target.value } : x)),
                      )
                    }
                  />
                  <div>
                    <button
                      className="icon-button"
                      disabled={i === 0}
                      aria-label="Move image earlier"
                      onClick={() => moveImage(i, -1)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={i === data.images.length - 1}
                      aria-label="Move image later"
                      onClick={() => moveImage(i, 1)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Remove image"
                      onClick={() =>
                        set(
                          'images',
                          data.images
                            .filter((_, n) => n !== i)
                            .map((img, position) => ({ ...img, position })),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label className="upload-zone">
              <Upload size={22} />
              <strong>{busy ? 'Uploading…' : 'Drop a little beautiful here'}</strong>
              <span>Choose an image from your device</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                }}
              />
            </label>
          </section>
          <section className="form-section">
            <div className="section-label">
              <h2>Variants, pricing & stock</h2>
              <button
                className="button light"
                onClick={() =>
                  set('variants', [
                    ...data.variants,
                    { sku: '', name: '', price: 100, stock: 0, weightGrams: 500, active: true },
                  ])
                }
              >
                <Plus size={14} />
                Add variant
              </button>
            </div>
            {data.variants.map((variant, i) => (
              <div className="variant-editor" key={i}>
                <div className="form-grid">
                  {[
                    ['name', 'Variant name'],
                    ['sku', 'SKU'],
                  ].map(([key, label]) => (
                    <label className="field" key={key}>
                      {label}
                      <input
                        value={variant[key as 'name' | 'sku']}
                        onChange={(e) =>
                          set(
                            'variants',
                            data.variants.map((v, n) => (n === i ? { ...v, [key]: e.target.value } : v)),
                          )
                        }
                      />
                    </label>
                  ))}
                  {[
                    ['price', 'Price (₹)'],
                    ['compareAtPrice', 'Compare-at price (₹)'],
                    ['stock', 'Available stock'],
                    ['weightGrams', 'Weight (grams)'],
                  ].map(([key, label]) => (
                    <label className="field" key={key}>
                      {label}
                      <input
                        type="number"
                        min={0}
                        step={key.toLowerCase().includes('price') ? '.01' : '1'}
                        value={
                          key === 'price'
                            ? variant.price / 100
                            : key === 'compareAtPrice'
                              ? variant.compareAtPrice
                                ? variant.compareAtPrice / 100
                                : ''
                              : variant[key as 'stock' | 'weightGrams']
                        }
                        onChange={(e) =>
                          set(
                            'variants',
                            data.variants.map((v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    [key]:
                                      key === 'compareAtPrice' && !e.target.value
                                        ? null
                                        : Math.round(
                                            Number(e.target.value) *
                                              (key.toLowerCase().includes('price') ? 100 : 1),
                                          ),
                                  }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                {data.variants.length > 1 && (
                  <button
                    className="text-danger"
                    onClick={() =>
                      set(
                        'variants',
                        data.variants.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Remove variant
                  </button>
                )}
              </div>
            ))}
          </section>
          <section className="form-section">
            <div className="section-label">
              <h2>Make it personal</h2>
              <button
                className="button light"
                onClick={() =>
                  set('customizations', [
                    ...data.customizations,
                    {
                      key: `message_${data.customizations.length}`,
                      label: 'Your message',
                      type: 'text',
                      required: false,
                      maxLength: 100,
                      options: [],
                      priceAdjustment: 0,
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add field
              </button>
            </div>
            {!data.customizations.length && (
              <p>Add names, messages, or choices your customer can personalize.</p>
            )}
            {data.customizations.map((field, i) => (
              <div className="variant-editor" key={i}>
                <div className="form-grid">
                  <label className="field">
                    Label
                    <input
                      value={field.label}
                      onChange={(e) =>
                        set(
                          'customizations',
                          data.customizations.map((f, n) => (n === i ? { ...f, label: e.target.value } : f)),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Field key
                    <input
                      value={field.key}
                      onChange={(e) =>
                        set(
                          'customizations',
                          data.customizations.map((f, n) => (n === i ? { ...f, key: e.target.value } : f)),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Type
                    <select
                      value={field.type}
                      onChange={(e) =>
                        set(
                          'customizations',
                          data.customizations.map((f, n) =>
                            n === i ? { ...f, type: e.target.value as typeof f.type } : f,
                          ),
                        )
                      }
                    >
                      {['text', 'textarea', 'select', 'radio', 'checkbox'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Extra price (₹)
                    <input
                      type="number"
                      min="0"
                      value={field.priceAdjustment / 100}
                      onChange={(e) =>
                        set(
                          'customizations',
                          data.customizations.map((f, n) =>
                            n === i ? { ...f, priceAdjustment: Math.round(Number(e.target.value) * 100) } : f,
                          ),
                        )
                      }
                    />
                  </label>
                  {['select', 'radio'].includes(field.type) && (
                    <label className="field span-2">
                      Options (comma separated)
                      <input
                        value={field.options.join(',')}
                        onChange={(e) =>
                          set(
                            'customizations',
                            data.customizations.map((f, n) =>
                              n === i ? { ...f, options: e.target.value.split(',') } : f,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      set(
                        'customizations',
                        data.customizations.map((f, n) =>
                          n === i ? { ...f, required: e.target.checked } : f,
                        ),
                      )
                    }
                  />
                  Required
                </label>
                <button
                  className="text-danger"
                  onClick={() =>
                    set(
                      'customizations',
                      data.customizations.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove field
                </button>
              </div>
            ))}
          </section>
          <section className="form-section">
            <h2>The finer details</h2>
            <div className="form-grid">
              {[
                ['artisan', 'Artisan / studio'],
                ['origin', 'Made in'],
                ['materials', 'Materials'],
                ['dimensions', 'Dimensions'],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    value={String(data[key as keyof ProductInput])}
                    onChange={(e) => set(key as keyof ProductInput, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="field">
              Care instructions
              <textarea value={data.care} onChange={(e) => set('care', e.target.value)} />
            </label>
          </section>
          <section className="form-section">
            <h2>Search engine listing</h2>
            <label className="field">
              URL slug
              <input value={data.slug} onChange={(e) => set('slug', e.target.value)} />
            </label>
            <label className="field">
              SEO title
              <input value={data.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} />
            </label>
            <label className="field">
              Meta description
              <textarea
                value={data.seoDescription || ''}
                onChange={(e) => set('seoDescription', e.target.value)}
              />
            </label>
          </section>
        </div>
        <aside className="stack editor-aside">
          <section className="form-section">
            <h2>Ready for the world?</h2>
            <label className="field">
              Status
              <select
                value={data.status}
                onChange={(e) => set('status', e.target.value as ProductInput['status'])}
              >
                {['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {data.status === 'SCHEDULED' && (
              <label className="field">
                Publish at
                <input
                  type="datetime-local"
                  onChange={(e) => set('publishedAt', new Date(e.target.value).toISOString())}
                />
              </label>
            )}
            <label className="field">
              Category
              <select value={data.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.featured}
                onChange={(e) => set('featured', e.target.checked)}
              />
              Feature on the homepage
            </label>
          </section>
          <section className="editor-note">
            <span className="eyebrow">A LITTLE REMINDER</span>
            <h3>The details tell the story.</h3>
            <p>
              Specific materials, honest dimensions, and a few words about the maker help customers choose
              with confidence.
            </p>
          </section>
          {id !== 'new' && (
            <button className="button light text-danger" onClick={() => setConfirm(true)}>
              Archive product
            </button>
          )}
        </aside>
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Archive this piece?"
        description="It will leave the storefront. Existing order history is preserved."
      >
        <button
          className="button"
          onClick={async () => {
            try {
              await api(`admin/products/${id}`, { method: 'DELETE' });
              router.push('/products');
            } catch (e) {
              setError((e as Error).message);
              setConfirm(false);
            }
          }}
        >
          Archive product
        </button>
      </Modal>
    </>
  );
}

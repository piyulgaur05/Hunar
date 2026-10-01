'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import type { Product, Taxonomy, ApiEnvelope } from '@mitti/types';
import { ProductCard } from './product-card';
export function Catalog({
  initialProducts,
  categories,
  initialCategory = '',
  collection = '',
  initialQuery = '',
}: {
  initialProducts: Product[];
  categories: Taxonomy[];
  initialCategory?: string;
  collection?: string;
  initialQuery?: string;
}) {
  const [filters, setFilters] = useState(false),
    [category, setCategory] = useState(initialCategory),
    [q, setQ] = useState(initialQuery),
    [sort, setSort] = useState('newest'),
    [max, setMax] = useState(''),
    [available, setAvailable] = useState(false),
    [personalized, setPersonalized] = useState(false),
    [page, setPage] = useState(1);
  const params = new URLSearchParams({
    q,
    category,
    collection,
    sort,
    page: String(page),
    limit: '12',
    ...(max ? { max } : {}),
    ...(available ? { available: 'true' } : {}),
    ...(personalized ? { personalized: 'true' } : {}),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', params.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('We couldn’t load these pieces. Please try again.');
      return response.json() as Promise<ApiEnvelope<Product[]>>;
    },
    placeholderData: { data: initialProducts, error: null },
  });
  let products = data?.data || [];
  if (sort === 'price-asc')
    products = [...products].sort((a, b) => a.variants[0].price - b.variants[0].price);
  if (sort === 'price-desc')
    products = [...products].sort((a, b) => b.variants[0].price - a.variants[0].price);
  return (
    <div className="shop-layout">
      <div className="shop-toolbar">
        <div>
          <button className="filter-button" onClick={() => setFilters(!filters)} aria-expanded={filters}>
            {filters ? <X size={15} /> : <SlidersHorizontal size={15} />}Filters
          </button>
          <span>{data?.meta?.total ?? products.length} thoughtful pieces</span>
        </div>
        <div>
          <Search size={15} />
          <input
            aria-label="Search collection"
            placeholder="Find your favourite…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Recently added</option>
            <option value="name">Name, A–Z</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </div>
      </div>
      <div className={`shop-body ${filters ? '' : 'no-filters'}`}>
        {filters && (
          <aside className="filters" aria-label="Product filters">
            <div className="filter-group">
              <h3>By craft</h3>
              <label>
                <input
                  type="radio"
                  name="category"
                  checked={!category}
                  onChange={() => {
                    setCategory('');
                    setPage(1);
                  }}
                />
                All pieces
              </label>
              {categories.map((c) => (
                <label key={c.id}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.slug}
                    onChange={() => {
                      setCategory(c.slug);
                      setPage(1);
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <div className="filter-group">
              <h3>A thoughtful budget</h3>
              <select
                className="input"
                aria-label="Maximum price"
                value={max}
                onChange={(e) => {
                  setMax(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any price</option>
                <option value="150000">Under ₹1,500</option>
                <option value="250000">Under ₹2,500</option>
                <option value="500000">Under ₹5,000</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => {
                    setAvailable(e.target.checked);
                    setPage(1);
                  }}
                />
                In stock
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={personalized}
                  onChange={(e) => {
                    setPersonalized(e.target.checked);
                    setPage(1);
                  }}
                />
                Make it personal
              </label>
            </div>
          </aside>
        )}
        <div>
          {error ? (
            <p className="error-message">{error.message}</p>
          ) : isLoading ? (
            <p>Finding beautiful things…</p>
          ) : products.length ? (
            <div className="product-grid">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>A little too specific?</h2>
              <p>Try a different search or give your filters a little room.</p>
              <button
                className="button light"
                onClick={() => {
                  setQ('');
                  setCategory('');
                  setMax('');
                  setAvailable(false);
                  setPersonalized(false);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {(data?.meta?.pages || 0) > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                ←
              </button>
              <span>
                Page {page} of {data?.meta?.pages}
              </span>
              <button
                disabled={page >= (data?.meta?.pages || 1)}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowUpRight } from 'lucide-react';
import { currency } from '@mitti/commerce';
import type { Product } from '@mitti/types';
import { request } from '@/lib/api';
import { DataTable, PageHeader, StatusBadge } from '@/components/ui';
export default function Products() {
  const [status, setStatus] = useState(''),
    [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', status, page],
    queryFn: () => request<Product[]>(`admin/products?limit=48&page=${page}&status=${status}`),
  });
  return (
    <>
      <PageHeader
        eyebrow="THE CATALOG"
        title="Every piece has a story."
        description="Create, curate, and care for your collection."
        action={
          <Link href="/products/new" className="button">
            <Plus size={16} />
            Add product
          </Link>
        }
      />
      <div className="admin-tabs">
        {[
          ['', 'All products'],
          ['PUBLISHED', 'Published'],
          ['DRAFT', 'Drafts'],
          ['SCHEDULED', 'Scheduled'],
          ['ARCHIVED', 'Archived'],
        ].map(([value, label]) => (
          <button
            className={status === value ? 'active' : ''}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            key={label}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="error-message">{error.message}</p>
      ) : isLoading ? (
        <div className="admin-loading">Opening your catalog…</div>
      ) : (
        <DataTable
          data={data?.data || []}
          searchPlaceholder="Search products, makers, or SKUs…"
          columns={[
            {
              id: 'Product',
              accessorKey: 'title',
              header: 'Product',
              cell: ({ row }) => (
                <Link href={`/products/${row.original.id}`} className="table-product">
                  <Image src={row.original.images[0].url} alt={row.original.title} width={45} height={52} />
                  <div>
                    <strong>{row.original.title}</strong>
                    <small>{row.original.artisan}</small>
                  </div>
                </Link>
              ),
            },
            {
              id: 'Status',
              accessorKey: 'status',
              header: 'Status',
              cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
            },
            {
              id: 'Inventory',
              accessorFn: (p) => p.variants.reduce((n, v) => n + (v.inventory?.available || 0), 0),
              header: 'Inventory',
              cell: ({ getValue }) => <span>{String(getValue())} in stock</span>,
            },
            { id: 'Category', accessorFn: (p) => p.category.name, header: 'Category' },
            {
              id: 'Price',
              accessorFn: (p) => p.variants[0]?.price || 0,
              header: 'Price',
              cell: ({ getValue }) => currency(Number(getValue())),
            },
            {
              id: 'Edit',
              header: '',
              cell: ({ row }) => (
                <Link
                  className="icon-button"
                  aria-label={`Edit ${row.original.title}`}
                  href={`/products/${row.original.id}`}
                >
                  <ArrowUpRight size={17} />
                </Link>
              ),
            },
          ]}
        />
      )}
      {(data?.meta?.pages || 0) > 1 && (
        <div className="pagination">
          <button className="button light" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous catalog page
          </button>
          <button
            className="button light"
            disabled={page >= (data?.meta?.pages || 1)}
            onClick={() => setPage(page + 1)}
          >
            Next catalog page
          </button>
        </div>
      )}
    </>
  );
}

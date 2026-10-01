'use client';
import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDownUp, ChevronLeft, ChevronRight, SlidersHorizontal, Search, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}
export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search…',
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  searchPlaceholder?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [filter, setFilter] = useState(''),
    [visibility, setVisibility] = useState({}),
    [showColumns, setShowColumns] = useState(false);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  return (
    <div className="data-table">
      <div className="table-toolbar">
        <label>
          <Search size={16} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
        <div className="column-control">
          <button onClick={() => setShowColumns(!showColumns)} className="button light">
            <SlidersHorizontal size={14} />
            Columns
          </button>
          {showColumns && (
            <div className="column-menu">
              {table.getAllLeafColumns().map((column) => (
                <label key={column.id}>
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  {column.id}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    <button
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <ArrowDownUp size={11} />}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.getRowModel().rows.length && (
          <div className="empty">
            <h3>No matches just yet.</h3>
            <p>Try another search or add your first record.</p>
          </div>
        )}
      </div>
      <div className="table-pagination">
        <span>
          {table.getFilteredRowModel().rows.length} records · Page {table.getState().pagination.pageIndex + 1}{' '}
          of {Math.max(1, table.getPageCount())}
        </span>
        <div>
          <button
            className="icon-button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="admin-modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

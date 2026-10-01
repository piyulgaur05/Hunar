'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  Layers,
  MessageSquare,
  Tag,
  FileText,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  ScrollText,
  ArrowUpRight,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  Image as ImageIcon,
} from 'lucide-react';
import type { Identity } from '@mitti/types';
import { api } from '@/lib/api';
const nav = [
  ['Overview', '/', LayoutDashboard, 'analytics:read'],
  ['Products', '/products', Package, 'products:read'],
  ['Orders', '/orders', ShoppingBag, 'orders:read'],
  ['Customers', '/customers', Users, 'customers:read'],
  ['Inventory', '/inventory', Boxes, 'products:read'],
  ['Collections', '/collections', Layers, 'products:read'],
  ['Reviews', '/reviews', MessageSquare, 'reviews:update'],
  ['Promotions', '/promotions', Tag, 'promotions:update'],
  ['Content', '/content', FileText, 'content:update'],
  ['Media library', '/media', ImageIcon, 'media:create'],
  ['Analytics', '/analytics', ChartNoAxesCombined, 'analytics:read'],
  ['Settings', '/settings', Settings, 'settings:update'],
  ['Team & access', '/users', ShieldCheck, 'users:update'],
  ['Audit log', '/audit', ScrollText, 'audit:read'],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['identity'],
    queryFn: () => api<Identity>('auth/me'),
    enabled: pathname !== '/login',
  });
  if (pathname === '/login') return children;
  if (isLoading) return <div className="admin-loading">Opening your workspace…</div>;
  if (error || !user)
    return (
      <div className="admin-login-required">
        <h1>Your workspace is waiting.</h1>
        <p>Sign in with your team account to continue.</p>
        <Link href="/login" className="button">
          Sign in
        </Link>
      </div>
    );
  const allowed = nav.filter((item) => user.permissions.includes('*') || user.permissions.includes(item[3]));
  return (
    <div className="admin-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="admin-brand">
          <Link href="/">
            Hunar<i>é</i>
          </Link>
          <span>COMMERCE STUDIO</span>
          <button
            className="icon-button close-sidebar"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-monogram">H.</span>
          <div>
            Hunaré<span>Where every craft tells a story</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <nav aria-label="Operations navigation">
          {allowed.map(([name, href, Icon]) => (
            <Link
              href={href}
              className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'active' : ''}
              key={href}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              <span>{name}</span>
              {name === 'Orders' && <span className="nav-tag">LIVE</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'}
            target="_blank"
            rel="noreferrer"
          >
            View your storefront <ArrowUpRight size={16} />
          </a>
          <div className="admin-profile">
            <span className="avatar">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              {user.name}
              <small>Team member</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                await api('auth/logout', { method: 'POST' });
                router.push('/login');
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="admin-body">
        <header className="admin-topbar">
          <div>
            <button
              className="icon-button admin-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="topbar-crumb">
              Workspace <span>/</span> {nav.find((n) => n[1] === pathname)?.[0] || 'Product editor'}
            </span>
          </div>
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                router.push(`/products?q=${encodeURIComponent(String(q))}`);
              }}
            >
              <Search size={16} />
              <input aria-label="Search products" name="q" placeholder="Search your catalog…" />
            </form>
            <Link href="/inventory" className="icon-button" aria-label="Inventory alerts">
              <Bell size={18} />
            </Link>
            <span className="avatar small">{user.name[0]}</span>
          </div>
        </header>
        <main className="admin-main">{children}</main>
        <footer className="admin-footer">
          <span>Made for the business of beautiful things.</span>
          <span>Hunaré · Commerce Studio</span>
        </footer>
      </div>
    </div>
  );
}

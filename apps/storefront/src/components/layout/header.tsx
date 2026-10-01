'use client';
import Link from 'next/link';
import { Search, Heart, UserRound, ShoppingBag, Menu, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useCart, useUi } from '../providers';
const defaultLinks = [
  { label: 'Shop all', href: '/shop' },
  { label: 'Collections', href: '/collections' },
  { label: 'The gift edit', href: '/shop?category=personalized' },
  { label: 'Our story', href: '/our-story' },
  { label: 'Journal', href: '/journal' },
];
export function Header({
  announcement,
  links = defaultLinks,
}: {
  announcement: string;
  links?: typeof defaultLinks;
}) {
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false);
  const { setBagOpen } = useUi(),
    { data: cart } = useCart();
  const router = useRouter();
  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) || 0;
  return (
    <>
      <div className="announcement">
        {announcement}
        <span>
          HANDMADE IN INDIA <span className="little-sun">✳</span>
        </span>
      </div>
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Mitti and Thread home">
          mitti <i>&</i> thread<span>OBJECTS WITH A SOUL</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search" onClick={() => setSearch(true)}>
            <Search size={19} />
          </button>
          <Link className="icon-button hide-mobile" href="/wishlist" aria-label="Wishlist">
            <Heart size={19} />
          </Link>
          <Link className="icon-button hide-mobile" href="/account" aria-label="My account">
            <UserRound size={19} />
          </Link>
          <button
            className="icon-button bag-button"
            aria-label={`Open bag, ${count} items`}
            onClick={() => setBagOpen(true)}
          >
            <ShoppingBag size={19} />
            {count > 0 && <span>{count}</span>}
          </button>
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={21} />
          </button>
        </div>
      </header>
      <Dialog.Root open={search} onOpenChange={setSearch}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="search-dialog">
            <Dialog.Title className="serif">Find something meaningful.</Dialog.Title>
            <Dialog.Description>Search for a piece, a material, or a little inspiration.</Dialog.Description>
            <Dialog.Close className="icon-button dialog-close" aria-label="Close search">
              <X />
            </Dialog.Close>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('q');
                setSearch(false);
                router.push(`/shop?q=${encodeURIComponent(String(q))}`);
              }}
            >
              <input
                name="q"
                aria-label="Search products"
                placeholder="Try “ceramics” or “a gift for her”"
                required
                autoFocus
              />
              <button className="button" type="submit">
                <Search size={18} />
                Search
              </button>
            </form>
            <div className="search-suggestions">
              A few favourites:{' '}
              {['Ceramics', 'Candles', 'Personalized'].map((text) => (
                <button
                  key={text}
                  onClick={() => {
                    setSearch(false);
                    router.push(`/shop?q=${text}`);
                  }}
                >
                  {text}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={menu} onOpenChange={setMenu}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="mobile-nav-dialog">
            <Dialog.Title className="wordmark">
              mitti <i>&</i> thread
            </Dialog.Title>
            <Dialog.Description className="sr-only">Browse the shop and your account</Dialog.Description>
            <Dialog.Close className="icon-button dialog-close" aria-label="Close menu">
              <X />
            </Dialog.Close>
            <nav>
              {[
                ...links,
                { label: 'Your wishlist', href: '/wishlist' },
                { label: 'Your account', href: '/account' },
              ].map((link) => (
                <Link onClick={() => setMenu(false)} href={link.href} key={link.href}>
                  {link.label}
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </nav>
            <p className="eyebrow">MADE SLOWLY. LOVED FOR YEARS.</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

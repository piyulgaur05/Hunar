import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Providers } from '@/components/providers';
import { Bag } from '@/components/cart/bag';
import { serverApi } from '@/lib/api';
import './globals.css';
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-editorial',
  display: 'swap',
});
const sans = Manrope({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: 'Mitti & Thread — Made by hand. Held by heart.', template: '%s | Mitti & Thread' },
  description:
    'Thoughtfully crafted ceramics, textiles, jewelry and meaningful gifts from independent Indian artisans.',
  openGraph: {
    title: 'Mitti & Thread',
    description: 'Objects with a soul. Handcrafted in India.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let announcement = 'Made with intention. Delivered with love. · Complimentary shipping above ₹2,500';
  let links;
  try {
    const content = await serverApi<{
      settings: { key: string; value: string }[];
      navigation: { items: { label: string; href: string }[] };
    }>('content');
    announcement = content.settings.find((s) => s.key === 'announcement')?.value || announcement;
    links = content.navigation?.items;
  } catch {}
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>
          <Header announcement={announcement} links={links} />
          <main id="main">{children}</main>
          <Footer />
          <Bag />
        </Providers>
      </body>
    </html>
  );
}

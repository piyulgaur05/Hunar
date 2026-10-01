import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Providers } from '@/components/providers';
import { Bag } from '@/components/cart/bag';
import { serverApi } from '@/lib/api';
import { BRAND_NAME as BRAND, BRAND_TAGLINE as TAGLINE } from '@/components/brand/wordmark';
import './globals.css';
const serif = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-editorial',
  display: 'swap',
});
const sans = Manrope({ subsets: ['latin'], weight: 'variable', variable: '--font-ui', display: 'swap' });
const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: `${BRAND} — ${TAGLINE}`, template: `%s | ${BRAND}` },
  description:
    'Hunaré brings together handcrafted ceramics, textiles, jewellery and meaningful gifts from independent Indian artisans. Every piece carries the story of the hands that made it.',
  applicationName: BRAND,
  openGraph: {
    title: `${BRAND} — ${TAGLINE}`,
    siteName: BRAND,
    description: 'Handcrafted in India. Every piece carries the story of the hands that made it.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let announcement = 'Every piece, a story worth keeping · Complimentary shipping above ₹2,500';
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

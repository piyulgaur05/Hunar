import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import './globals.css';
const sans = Manrope({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
export const metadata: Metadata = {
  title: 'Commerce Studio | Mitti & Thread',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}

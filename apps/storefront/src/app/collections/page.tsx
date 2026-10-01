import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { serverApi } from '@/lib/api';
import type { Taxonomy } from '@mitti/types';
export const metadata = { title: 'Considered collections' };
export default async function Collections() {
  const collections = await serverApi<Taxonomy[]>('collections');
  return (
    <>
      <div className="page-heading">
        <span className="chapter">
          <b>Collections</b>Stories, gathered
        </span>
        <span className="eyebrow">THOUGHTFULLY BROUGHT TOGETHER</span>
        <h1>
          Find your kind of <em>beautiful</em>.
        </h1>
        <p>Little worlds of handmade things, curated for the people, places, and moments that matter.</p>
      </div>
      <div className="collection-index">
        {collections.map((c, i) => (
          <Link className="collection-card" href={`/collections/${c.slug}`} key={c.id}>
            <div className="collection-image">
              <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="(max-width:640px) 50vw,33vw"
                style={{ objectFit: 'cover' }}
              />
              <span className="collection-number">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div>
              <h3>
                {c.name}
                <ArrowUpRight size={20} />
              </h3>
              <p className="muted">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

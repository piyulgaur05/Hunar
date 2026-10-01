import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, HandHeart, Leaf, Gift, Truck, Star } from 'lucide-react';
import type { Product, Taxonomy, CmsSection } from '@mitti/types';
import { serverApi } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { Newsletter } from '@/components/editorial/newsletter';
import { CraftMarquee } from '@/components/editorial/craft-marquee';
import { Reveal } from '@/components/motion/reveal';
import { Parallax } from '@/components/motion/parallax';
import { StoryThread } from '@/components/motion/story-thread';
import { BRAND_NAME, Seal } from '@/components/brand/wordmark';
const chapterNames = [
  'Begin here',
  'The collections',
  'Loved pieces',
  'The makers',
  'In their words',
  'Letters',
];
export default async function Home() {
  const [{ sections }, products, collections, categories] = await Promise.all([
    serverApi<{ sections: CmsSection[] }>('content'),
    serverApi<Product[]>('products?featured=true&limit=4'),
    serverApi<Taxonomy[]>('collections'),
    serverApi<Taxonomy[]>('categories').catch(() => [] as Taxonomy[]),
  ]);
  const chapter = (n: number) => (
    <span className="chapter">
      <b>{String(n).padStart(2, '0')}</b>
      {chapterNames[n - 1]}
    </span>
  );
  return (
    <>
      <StoryThread />
      {sections.map((section) => {
        const c = section.content;
        const [titleStart, titleEnd] = section.title.split('\n');
        if (section.type === 'hero')
          return (
            <section className="hero" key={section.id}>
              <div className="hero-copy">
                {chapter(1)}
                <span className="eyebrow">
                  <span className="tiny-rule" />
                  {c.eyebrow}
                </span>
                <h1>
                  <span className="hero-line">{titleStart}</span>
                  {titleEnd && (
                    <>
                      <br />
                      <em className="hero-line">{titleEnd}</em>
                    </>
                  )}
                </h1>
                <p>{c.description}</p>
                <div className="hero-actions">
                  <Link className="button" href={c.href}>
                    {c.cta}
                    <ArrowUpRight size={18} />
                  </Link>
                  <Link className="text-link" href="/our-story">
                    Read our story
                  </Link>
                </div>
                <div className="hero-signature">
                  <Seal size={92} />
                  <div>
                    Not just made.
                    <br />
                    <strong>Made to mean something.</strong>
                  </div>
                </div>
              </div>
              <Parallax className="hero-image" strength={30}>
                <Image
                  src={c.image}
                  alt="A warm, sunlit home filled with natural textures and thoughtfully crafted objects"
                  fill
                  priority
                  sizes="(max-width:768px) 100vw, 58vw"
                  style={{ objectFit: 'cover' }}
                />
                <span className="hero-image-note">{c.note}</span>
                <div className="hero-image-caption">
                  <span>{c.caption}</span>
                  <span>01 — 03</span>
                </div>
              </Parallax>
              <div className="hero-bottom">
                <span>A SLOWER KIND OF BEAUTIFUL</span>
                <span>
                  SCROLL TO FOLLOW THE THREAD <ArrowRight size={14} />
                </span>
              </div>
            </section>
          );
        if (section.type === 'collections')
          return (
            <div key={section.id}>
              <CraftMarquee items={categories.map((cat) => cat.name)} />
              <div className="value-strip">
                <span>
                  <HandHeart size={20} />
                  Crafted by real hands
                </span>
                <span>
                  <Leaf size={19} />
                  Mindfully made
                </span>
                <span>
                  <Gift size={19} />
                  Ready for meaningful gifting
                </span>
                <span>
                  <Truck size={20} />
                  Delivered with care
                </span>
              </div>
              <section className="section collections-section">
                <Reveal className="section-heading">
                  <div>
                    {chapter(2)}
                    <span className="eyebrow">{c.eyebrow}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <div>
                    <p>{c.description}</p>
                    <Link className="text-link" href="/collections">
                      Explore all collections <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </Reveal>
                <div className="collection-grid">
                  {collections.slice(0, 3).map((collection, i) => (
                    <Reveal
                      key={collection.id}
                      delay={i * 0.12}
                      className={`collection-card collection-${i}`}
                    >
                      <Link href={`/collections/${collection.slug}`}>
                        <div className="collection-image">
                          <Image
                            src={collection.image}
                            alt={collection.name}
                            fill
                            sizes="(max-width:640px) 100vw, 33vw"
                            style={{ objectFit: 'cover' }}
                          />
                          <span className="collection-number">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <div>
                          <span className="eyebrow">
                            {
                              [
                                'FOR YOUR EVERYDAY',
                                'FOR YOUR FAVOURITE CORNERS',
                                'FOR SOMEONE LIKE NO OTHER',
                              ][i]
                            }
                          </span>
                          <h3>
                            {collection.name}
                            <ArrowUpRight size={22} />
                          </h3>
                          <p>{collection.description}</p>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </section>
            </div>
          );
        if (section.type === 'bestsellers')
          return (
            <section className="section bestsellers" key={section.id}>
              <Reveal className="section-heading">
                <div>
                  {chapter(3)}
                  <span className="eyebrow">{c.eyebrow}</span>
                  <h2>{section.title}</h2>
                </div>
                <Link className="text-link" href="/shop">
                  Find your favourite <ArrowUpRight size={15} />
                </Link>
              </Reveal>
              <div className="product-grid">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={i * 0.08}>
                    <ProductCard product={p} index={i} />
                  </Reveal>
                ))}
              </div>
            </section>
          );
        if (section.type === 'story')
          return (
            <section className="maker-story" key={section.id}>
              <Parallax className="maker-image" strength={24}>
                <Image
                  src={c.image}
                  alt="Handcrafted pottery, with the marks and character of its maker"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                />
                <span>THE HANDS BEHIND THE BEAUTIFUL</span>
              </Parallax>
              <Reveal className="maker-copy">
                {chapter(4)}
                <span className="eyebrow">{c.eyebrow}</span>
                <h2>
                  {titleStart}
                  {titleEnd && (
                    <>
                      <br />
                      <em>{titleEnd}</em>
                    </>
                  )}
                </h2>
                <p>{c.description}</p>
                <Link className="button light" href={c.href}>
                  {c.cta}
                  <ArrowUpRight size={16} />
                </Link>
                <div className="maker-footnote">
                  <span className="serif">
                    Made slowly.
                    <br />
                    <em>Kept for years.</em>
                  </span>
                  <HandHeart strokeWidth={0.9} size={55} />
                </div>
              </Reveal>
            </section>
          );
        if (section.type === 'testimonials')
          return (
            <Reveal as="section" className="testimonial section" key={section.id}>
              {chapter(5)}
              <span className="eyebrow">{section.title}</span>
              <div className="stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <blockquote>
                <span className="quote-mark" aria-hidden="true">
                  “
                </span>
                {c.quote}
              </blockquote>
              <p>{c.author}</p>
              <span className="eyebrow muted">A NOTE FROM OUR COMMUNITY</span>
            </Reveal>
          );
        if (section.type === 'newsletter')
          return (
            <Reveal key={section.id}>
              <Newsletter title={section.title} description={c.description} chapter={chapter(6)} />
            </Reveal>
          );
        return null;
      })}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: BRAND_NAME,
            slogan: 'Where Every Craft Tells a Story.',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          }).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}

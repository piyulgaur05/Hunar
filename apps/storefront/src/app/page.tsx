import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, HandHeart, Leaf, Gift, Truck, Star } from 'lucide-react';
import type { Product, Taxonomy, CmsSection } from '@mitti/types';
import { serverApi } from '@/lib/api';
import { ProductCard } from '@/components/product/product-card';
import { Newsletter } from '@/components/editorial/newsletter';
export default async function Home() {
  const [{ sections }, products, collections] = await Promise.all([
    serverApi<{ sections: CmsSection[] }>('content'),
    serverApi<Product[]>('products?featured=true&limit=4'),
    serverApi<Taxonomy[]>('collections'),
  ]);
  return (
    <>
      {sections.map((section) => {
        const c = section.content;
        if (section.type === 'hero')
          return (
            <section className="hero" key={section.id}>
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-rule" />
                  {c.eyebrow}
                </span>
                <h1>
                  {section.title.split('\n')[0]}
                  <br />
                  <em>{section.title.split('\n')[1]}</em>
                </h1>
                <p>{c.description}</p>
                <Link className="button" href={c.href}>
                  {c.cta}
                  <ArrowUpRight size={18} />
                </Link>
                <div className="hero-signature">
                  <span className="craft-seal">
                    m<span>& t</span>
                  </span>
                  <div>
                    Not just made.
                    <br />
                    <strong>Made to mean something.</strong>
                  </div>
                </div>
              </div>
              <div className="hero-image">
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
              </div>
              <div className="hero-bottom">
                <span>A SLOWER KIND OF BEAUTIFUL</span>
                <span>
                  DESIGNED TO BE KEPT, NOT JUST GIVEN <ArrowRight size={14} />
                </span>
              </div>
            </section>
          );
        if (section.type === 'collections')
          return (
            <div key={section.id}>
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
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{c.eyebrow}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <div>
                    <p>{c.description}</p>
                    <Link className="text-link" href="/collections">
                      Explore all collections <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
                <div className="collection-grid">
                  {collections.slice(0, 3).map((collection, i) => (
                    <Link
                      href={`/collections/${collection.slug}`}
                      key={collection.id}
                      className={`collection-card collection-${i}`}
                    >
                      <div className="collection-image">
                        <Image
                          src={collection.image}
                          alt={collection.name}
                          fill
                          sizes="(max-width:640px) 100vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <span className="eyebrow">
                          {
                            ['FOR YOUR EVERYDAY', 'FOR YOUR FAVOURITE CORNERS', 'FOR SOMEONE LIKE NO OTHER'][
                              i
                            ]
                          }
                        </span>
                        <h3>
                          {collection.name}
                          <ArrowUpRight size={22} />
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          );
        if (section.type === 'bestsellers')
          return (
            <section className="section bestsellers" key={section.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{c.eyebrow}</span>
                  <h2>{section.title}</h2>
                </div>
                <Link className="text-link" href="/shop">
                  Find your favourite <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="product-grid">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </section>
          );
        if (section.type === 'story')
          return (
            <section className="maker-story" key={section.id}>
              <div className="maker-image">
                <Image
                  src={c.image}
                  alt="Handcrafted pottery, with the marks and character of its maker"
                  fill
                  sizes="(max-width:768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                />
                <span>THE HANDS BEHIND THE BEAUTIFUL</span>
              </div>
              <div className="maker-copy">
                <span className="eyebrow">{c.eyebrow}</span>
                <h2>{section.title}</h2>
                <p>{c.description}</p>
                <Link className="text-link" href={c.href}>
                  {c.cta}
                  <ArrowUpRight size={16} />
                </Link>
                <div className="maker-footnote">
                  <span className="serif">
                    Made slowly.
                    <br />
                    <em>Loved for years.</em>
                  </span>
                  <HandHeart strokeWidth={1} size={55} />
                </div>
              </div>
            </section>
          );
        if (section.type === 'testimonials')
          return (
            <section className="testimonial section" key={section.id}>
              <span className="eyebrow">{section.title}</span>
              <div className="stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <blockquote>“{c.quote}”</blockquote>
              <p>{c.author}</p>
              <span className="eyebrow muted">A NOTE FROM OUR COMMUNITY</span>
            </section>
          );
        if (section.type === 'newsletter')
          return <Newsletter key={section.id} title={section.title} description={c.description} />;
        return null;
      })}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Mitti & Thread',
            url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          }).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}

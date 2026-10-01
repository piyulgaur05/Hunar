import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { BRAND_NAME, Seal, WordmarkText } from '../brand/wordmark';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-giant" aria-hidden="true">
        <WordmarkText />
      </div>
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" className="wordmark" aria-label={`${BRAND_NAME} home`}>
            <WordmarkText />
          </Link>
          <p>
            Where every craft
            <br />
            tells a story.
          </p>
          <span className="eyebrow">ROOTED IN INDIA · MADE BY HAND</span>
          <Seal size={88} className="footer-seal" />
        </div>
        <div>
          <h3>Chapters</h3>
          <Link href="/shop">All pieces</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/shop?category=personalized">Personalized gifts</Link>
          <Link href="/our-story">Our story</Link>
          <Link href="/journal">Journal</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link href="/shipping">Shipping & delivery</Link>
          <Link href="/returns">Returns & care</Link>
          <Link href="/contact">Get in touch</Link>
          <Link href="/account">Your account</Link>
        </div>
        <div>
          <h3>Write to us</h3>
          <Link className="footer-contact" href="/contact">
            Start a conversation <ArrowUpRight size={17} />
          </Link>
          <p>
            Monday – Saturday
            <br />
            10 am – 6 pm IST
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {BRAND_NAME}. Every piece, a story worth keeping.
        </span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>INDIA · INR ₹</span>
        </div>
      </div>
    </footer>
  );
}

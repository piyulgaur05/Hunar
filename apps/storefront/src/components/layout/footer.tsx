import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Link href="/" className="wordmark">
            mitti <i>&</i> thread
          </Link>
          <p>
            Made by hand.
            <br />
            For the things that matter.
          </p>
          <span className="eyebrow">ROOTED IN INDIA. MADE WITH LOVE.</span>
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/shop">All pieces</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/shop?category=personalized">Personalized gifts</Link>
          <Link href="/our-story">Our story</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link href="/shipping">Shipping & delivery</Link>
          <Link href="/returns">Returns & care</Link>
          <Link href="/contact">Get in touch</Link>
          <Link href="/account">Your account</Link>
        </div>
        <div>
          <h3>A note, a question, a hello?</h3>
          <Link className="footer-contact" href="/contact">
            We’d love to hear from you <ArrowUpRight size={17} />
          </Link>
          <p>
            Monday – Saturday
            <br />
            10 am – 6 pm IST
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Mitti & Thread. Thoughtfully made.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>INDIA · INR ₹</span>
        </div>
      </div>
    </footer>
  );
}

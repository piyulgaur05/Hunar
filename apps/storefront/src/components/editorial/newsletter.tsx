'use client';
import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Seal } from '../brand/wordmark';
/** A postcard from the workshop: perforated edge, a stamp in the corner, and a line to write on. */
export function Newsletter({
  title,
  description,
  chapter,
}: {
  title: string;
  description: string;
  chapter?: ReactNode;
}) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const [first, second] = title.split('\n');
  return (
    <section className="newsletter">
      <div className="postcard">
        <div className="postcard-stamp" aria-hidden="true">
          <Seal size={74} />
        </div>
        <div>
          {chapter}
          <span className="eyebrow">LETTERS FROM THE WORKSHOP</span>
          <h2>
            {first}
            {second && (
              <>
                <br />
                <em>{second}</em>
              </>
            )}
          </h2>
        </div>
        <div>
          <p>{description}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const { message } = await api<{ message: string }>('newsletter', {
                  method: 'POST',
                  body: JSON.stringify({ email: new FormData(e.currentTarget).get('email') }),
                });
                setMessage(message);
              } catch (error) {
                setMessage((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="Your email address"
              aria-label="Your email address"
              required
            />
            <button disabled={busy} aria-label="Subscribe to letters">
              <ArrowRight size={23} />
            </button>
          </form>
          <p className="newsletter-note" role="status">
            {message || 'Only the good things. Unsubscribe anytime.'}
          </p>
        </div>
      </div>
    </section>
  );
}

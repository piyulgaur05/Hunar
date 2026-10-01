'use client';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
export function Newsletter({ title, description }: { title: string; description: string }) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">LET’S STAY A LITTLE CLOSER</span>
        <h2>{title}</h2>
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
    </section>
  );
}

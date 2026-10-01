'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import type { Identity } from '@mitti/types';
export default function Login() {
  const router = useRouter(),
    client = useQueryClient();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-editorial">
        <span className="admin-login-wordmark">
          Hunar<i>é</i>
        </span>
        <div>
          <span className="eyebrow">THE COMMERCE STUDIO</span>
          <h1>
            The business of
            <br />
            <em>beautiful things.</em>
          </h1>
          <p>A considered workspace for your products, your people, and every order in between.</p>
        </div>
        <span>MADE WITH INTENTION. MANAGED WITH CARE.</span>
      </div>
      <div className="login-form">
        <div>
          <ShieldCheck size={26} strokeWidth={1} />
          <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
          <h2>A little care, behind the scenes.</h2>
          <p>Sign in with your team account to continue.</p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const form = Object.fromEntries(new FormData(e.currentTarget));
                const user = await api<Identity>('auth/login', {
                  method: 'POST',
                  body: JSON.stringify(form),
                });
                if (!user.permissions.length) {
                  await api('auth/logout', { method: 'POST' });
                  throw new Error('This account does not have workspace access.');
                }
                await client.invalidateQueries({ queryKey: ['identity'] });
                router.push('/');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Work email
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                placeholder="you@yourstudio.com"
              />
            </label>
            <label className="field">
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              {busy ? 'Signing in…' : 'Enter your workspace'}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="login-footnote">
            Access is limited to authorized team members. All administrative changes are recorded.
          </p>
        </div>
      </div>
    </div>
  );
}
